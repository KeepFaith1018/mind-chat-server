export declare class ChatMessageDto {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export declare class ChatDto {
    messages: ChatMessageDto[];
    model?: string;
    conversationId?: string;
    fileIds?: string[];
}
