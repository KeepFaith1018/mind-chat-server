import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';

export interface WebSearchItem {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchTrace {
  query: string;
  provider: 'tavily' | 'duckduckgo' | 'none';
  results: WebSearchItem[];
}

interface SearchExecutionOptions {
  freshnessCritical: boolean;
}

interface DuckDuckGoResponse {
  Heading?: string;
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
    Topics?: Array<{
      Text?: string;
      FirstURL?: string;
    }>;
  }>;
}

interface TavilySearchResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
}

@Injectable()
export class SearchService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  async search(query: string): Promise<WebSearchItem[]> {
    const trace = await this.searchWithTrace(query);
    return trace.results;
  }

  async searchWithTrace(query: string): Promise<WebSearchTrace> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      this.logger.info('WebSearch.Skipped', {
        reason: 'empty_query',
      });
      return {
        query: '',
        provider: 'none',
        results: [],
      };
    }
    this.logger.info('WebSearch.Start', {
      queryLength: normalizedQuery.length,
      queryPreview: normalizedQuery.slice(0, 200),
    });
    const freshnessCritical = this.isFreshnessCriticalQuery(normalizedQuery);
    this.logger.info('WebSearch.FreshnessMode', {
      query: normalizedQuery,
      freshnessCritical,
    });

    const tavilyApiKey = this.configService
      .get<string>('TAVILY_API_KEY')
      ?.trim();
    if (tavilyApiKey) {
      this.logger.info('WebSearch.ProviderAttempt', {
        provider: 'tavily',
        query: normalizedQuery,
      });
      const tavilyResults = await this.searchByTavily(
        normalizedQuery,
        tavilyApiKey,
        { freshnessCritical },
      );
      if (tavilyResults.length > 0) {
        this.logger.info('WebSearch.ProviderSelected', {
          provider: 'tavily',
          query: normalizedQuery,
          resultCount: tavilyResults.length,
          previewItems: this.toPreviewItems(tavilyResults),
        });
        return {
          query: normalizedQuery,
          provider: 'tavily',
          results: tavilyResults,
        };
      }
    }

    if (freshnessCritical) {
      this.logger.warn('WebSearch.FallbackSkippedForFreshness', {
        query: normalizedQuery,
        reason: 'realtime_query_without_fresh_results',
      });
      return {
        query: normalizedQuery,
        provider: 'none',
        results: [],
      };
    }

    this.logger.info('WebSearch.ProviderAttempt', {
      provider: 'duckduckgo',
      query: normalizedQuery,
    });
    const ddgResults = await this.searchByDuckDuckGo(normalizedQuery);
    this.logger.info('WebSearch.ProviderSelected', {
      provider: 'duckduckgo',
      query: normalizedQuery,
      resultCount: ddgResults.length,
      previewItems: this.toPreviewItems(ddgResults),
    });
    return {
      query: normalizedQuery,
      provider: 'duckduckgo',
      results: ddgResults,
    };
  }

  private async searchByTavily(
    query: string,
    apiKey: string,
    options: SearchExecutionOptions,
  ): Promise<WebSearchItem[]> {
    const endpoint =
      this.configService.get<string>('WEB_SEARCH_ENDPOINT_TAVILY') ||
      'https://api.tavily.com/search';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: options.freshnessCritical ? 8 : 5,
          search_depth: 'advanced',
          topic: options.freshnessCritical ? 'news' : 'general',
          days: options.freshnessCritical ? 7 : undefined,
          include_answer: false,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.warn('WebSearch.TavilyNonOkResponse', {
          status: response.status,
          endpoint,
          query,
        });
        return [];
      }
      const json = (await response.json()) as TavilySearchResponse;
      const items = (json.results || [])
        .filter((item) => item.title && item.url && item.content)
        .slice(0, 5)
        .map((item) => ({
          title: item.title as string,
          url: item.url as string,
          snippet: (item.content as string).slice(0, 300),
        }));
      this.logger.info('WebSearch.Completed', {
        provider: 'tavily',
        endpoint,
        query,
        freshnessCritical: options.freshnessCritical,
        resultCount: items.length,
        previewItems: this.toPreviewItems(items),
      });
      return items;
    } catch (error: unknown) {
      this.logger.warn('WebSearch.TavilyFailed', {
        endpoint,
        query,
        freshnessCritical: options.freshnessCritical,
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : { message: String(error) },
      });
      return [];
    }
  }

  private async searchByDuckDuckGo(query: string): Promise<WebSearchItem[]> {
    const endpoint =
      this.configService.get<string>('WEB_SEARCH_ENDPOINT_DDG') ||
      'https://api.duckduckgo.com/';
    const url = new URL(endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('no_redirect', '1');
    url.searchParams.set('no_html', '1');
    url.searchParams.set('skip_disambig', '1');

    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.warn('WebSearch.DDGNonOkResponse', {
          status: response.status,
          endpoint,
          query,
        });
        return [];
      }
      const json = (await response.json()) as DuckDuckGoResponse;
      const items = this.normalizeResponse(json, query).slice(0, 5);
      this.logger.info('WebSearch.Completed', {
        provider: 'duckduckgo',
        endpoint,
        query,
        resultCount: items.length,
        previewItems: this.toPreviewItems(items),
      });
      return items;
    } catch (error: unknown) {
      this.logger.warn('WebSearch.DDGFailed', {
        endpoint,
        query,
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : { message: String(error) },
      });
      return [];
    }
  }

  buildContext(results: WebSearchItem[]): string {
    if (results.length === 0) {
      return '';
    }

    const lines = results.map(
      (item, index) =>
        `[网页 ${index + 1}] 标题: ${item.title}\n链接: ${item.url}\n摘要: ${item.snippet}`,
    );
    return `\n\n=== 联网检索结果开始 ===\n${lines.join(
      '\n\n',
    )}\n=== 联网检索结果结束 ===\n`;
  }

  private normalizeResponse(
    payload: DuckDuckGoResponse,
    fallbackTitle: string,
  ): WebSearchItem[] {
    const items: WebSearchItem[] = [];

    if (payload.AbstractText && payload.AbstractURL) {
      items.push({
        title: payload.Heading || fallbackTitle,
        url: payload.AbstractURL,
        snippet: payload.AbstractText,
      });
    }

    const pushItem = (text?: string, firstURL?: string) => {
      if (!text || !firstURL) {
        return;
      }
      items.push({
        title: this.extractTitle(text),
        url: firstURL,
        snippet: text,
      });
    };

    for (const topic of payload.RelatedTopics || []) {
      if (topic.Topics?.length) {
        for (const child of topic.Topics) {
          pushItem(child.Text, child.FirstURL);
        }
      } else {
        pushItem(topic.Text, topic.FirstURL);
      }
    }

    return items;
  }

  private extractTitle(text: string) {
    const [title] = text.split(' - ');
    return title || text.slice(0, 40);
  }

  private toPreviewItems(items: WebSearchItem[]) {
    return items.slice(0, 3).map((item, index) => ({
      rank: index + 1,
      title: item.title.slice(0, 80),
      url: item.url,
      snippetPreview: item.snippet.slice(0, 120),
    }));
  }

  private isFreshnessCriticalQuery(query: string): boolean {
    const patterns = [
      /最新|最近|刚刚|今天|今日|昨[天日]|本周|本月|今年|当前/i,
      /latest|recent|today|yesterday|this week|this month|this year|current/i,
      /实时|新闻|快讯|股价|汇率|天气|比分|发布会|财报|热搜/i,
    ];
    return patterns.some((pattern) => pattern.test(query));
  }
}
