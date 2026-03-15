import { Injectable } from '@nestjs/common';

export interface WebSearchItem {
  title: string;
  url: string;
  snippet: string;
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

@Injectable()
export class SearchService {
  async search(query: string): Promise<WebSearchItem[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    const url = new URL('https://api.duckduckgo.com/');
    url.searchParams.set('q', normalizedQuery);
    url.searchParams.set('format', 'json');
    url.searchParams.set('no_redirect', '1');
    url.searchParams.set('no_html', '1');
    url.searchParams.set('skip_disambig', '1');

    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10000),
      });
      const json = (await response.json()) as DuckDuckGoResponse;
      return this.normalizeResponse(json, normalizedQuery).slice(0, 5);
    } catch {
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
}
