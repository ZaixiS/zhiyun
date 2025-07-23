
    interface EventMessage {
      message?: string;
      content?: string;
      [key: string]: any;
    }

    interface ApiResponse {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
      [key: string]: any;
    }

    interface CloudFunctionResult {
      success: boolean;
      reply?: string;
      error?: string;
      rawData?: ApiResponse;
    }

    interface CloudFunctionEvent {
      message?: string;
      content?: string;
      [key: string]: any;
    }

    export declare function main(event: CloudFunctionEvent | string, context: any): Promise<CloudFunctionResult>;
  