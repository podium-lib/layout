import { HttpIncoming, AssetJs, AssetCss } from '@podium/utils';
import PodiumClient from '@podium/client';

// Use declaration merging to extend Express.
declare global {
    namespace Express {
        interface Response {
            podiumSend(fragment: string, ...args: unknown[]): Response;
        }
    }
}

export interface LayoutOptions {
    name: string;
    pathname: string;
    logger?: any;
    context?: {};
    client?: {};
    proxy?: {};
}

export default class Layout {

    readonly client: PodiumClient;
    readonly metrics: any;
    readonly context: any;

    constructor(options: LayoutOptions);

    middleware(): (req: any, res: any, next: any) => Promise<void>;

    pathname(): string;

    js(options: AssetJs | Array<AssetJs>): void;

    css(options: AssetCss | Array<AssetCss>): void;

    view(
        template: (
            incoming: HttpIncoming,
            fragment: string,
            ...args: unknown[]
        ) => string,
    ): void

    render(incoming: HttpIncoming, fragment: string, ...args: unknown[]): string;

    process(incoming: HttpIncoming): Promise<HttpIncoming>;
}
