import express from 'express';
import Layout from '../../lib/layout.js';

const layout = new Layout({
    pathname: '/foo',
    logger: console,
    name: 'demo',
    client: {
        timeout: 5000,
    },
});

const header = layout.client.register({
    name: 'header',
    uri: 'http://localhost:6101/manifest.json',
});

const menu = layout.client.register({
    name: 'menu',
    uri: 'http://localhost:6102/manifest.json',
});

const content = layout.client.register({
    name: 'content',
    uri: 'http://localhost:6103/manifest.json',
});

const footer = layout.client.register({
    name: 'footer',
    uri: 'http://localhost:6104/manifest.json',
});

const sidebar = layout.client.register({
    name: 'sidebar',
    uri: 'http://localhost:6105/manifest.json',
});

layout.css({ value: '/css' });

const app = express();

app.use(layout.pathname(), layout.middleware());

app.get('/foo/css', (req, res) => {
    res.set('Content-Type', 'text/css');
    res.send(`
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        @keyframes pulse {
            0% {
                background-color: #e0e0e0;
            }
            50% {
                background-color: #f0f0f0;
            }
            100% {
                background-color: #e0e0e0;
            }
        }
        .skeleton {
            width: 100%;
            background-color: #e0e0e0;
            border-radius: 5px;
            animation: pulse 1.5s infinite ease-in-out;
            margin: 0;
			box-sizing: border-box;
        }
        .skeleton--header {
            height:600px;
        }
        .skeleton--menu {
            height:40px;
        }
        .skeleton--content {
            height:300px;
        }
        .skeleton--sidebar {
            height:500px;
        }
        .skeleton--footer {
            padding: 1em 0 6em 0;
        }
        .wrapper {
            font-family: Verdana, serif;
            font-weight: 400;
            font-style: normal;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 2em;
        }
        .container {
            width: 75%;
            max-width: 1000px;
            margin: 0 auto;
        }
        .main {
            display: flex;
            gap: 1em;
            flex-direction: column;
            @media (min-width: 800px) {
                flex-direction: row;
            }
        }
        .content {
            flex-grow: 2;
        }
        .sidebar {
            flex-grow: 1;
        }
        
	`);
});

app.get(layout.pathname(), async (req, res) => {
    const incoming = res.locals.podium;

    // --------------------------------------------------------
    // Define any template variables such as the document title
    // --------------------------------------------------------

    incoming.view = {
        title: 'Example streaming application',
    };

    const headerFetch = header.fetch(incoming);
    const menuFetch = menu.fetch(incoming);
    const contentFetch = content.fetch(incoming);
    const footerFetch = footer.fetch(incoming);
    const sidebarFetch = sidebar.fetch(incoming);

    // -----------------------------------------------------------
    // Start the stream and flush the document head to the browser
    // -----------------------------------------------------------

    // we kick off the stream, this automatically sends the document opening html including everything in the <head>
    // as well as the openning <body> tag.
    const stream = await res.podiumStream();

    // -----------------------------------------------------------------------
    // Immediately send the document structure and placeholders to the browser
    // -----------------------------------------------------------------------

    // stream in the document body with slot skeleton screen placeholders for podlets
    // these will be replaced once the podlets are loaded
    stream.send(`
        <template shadowrootmode="open">
            <link href="/foo/css" type="text/css" rel="stylesheet">
            <div class="wrapper">
                <section>
                    <section>
                        <slot name="menu"><div class="skeleton skeleton--menu"></div></slot>
                    </section>
                    <header>
                        <slot name="header"><div class="skeleton skeleton--header"></div></slot>
                    </header>
                </section>
                <main class="main container">
                    <div class="content">
                        <slot name="content"><div class="skeleton skeleton--content"></div></slot>
                    </div>
                    <aside class="sidebar">
                        <slot name="sidebar"><div class="skeleton skeleton--sidebar"></div></slot>
                    </aside>
                </main>
                <footer class="footer">
                    <slot name="footer"><div class="skeleton skeleton--footer"></div></slot>
                </footer>
            </div>
        </template>
    `);

    // ---------------------------------------------------------
    // Option 1. Load podlets one at a time as they are fetched
    // ---------------------------------------------------------

    const [headerData, menuData, contentData, footerData, sidebarData] =
        await Promise.all([
            headerFetch,
            menuFetch,
            contentFetch,
            footerFetch,
            sidebarFetch,
        ]);

    stream.send(`
        <div slot="header">${headerData}</div>
        <div slot="menu">${menuData}</div>
        <div slot="content">${contentData}</div>
        <div slot="footer">${footerData}</div>
        <div slot="sidebar">${sidebarData}</div>
    `);

    // ---------------------------------------------------------------------
    // Option 2. Load all podlets at once after everything has been fetched
    // ---------------------------------------------------------------------

    // const prom1 = headerFetch.then((data) => {
    //     stream.send(`<div slot="header">${data}</div>`);
    // });
    // const prom2 = menuFetch.then((data) => {
    //     stream.send(`<div slot="menu">${data}</div>`);
    // });
    // const prom3 = contentFetch.then((data) => {
    //     stream.send(`<div slot="content">${data}</div>`);
    // });
    // const prom4 = footerFetch.then((data) => {
    //     stream.send(`<div slot="footer">${data}</div>`);
    // });

    // await Promise.all([prom1, prom2, prom3, prom4]);

    // --------------------------
    // Close the stream when done
    // --------------------------

    stream.done();
});

app.use(`${layout.pathname()}/assets`, express.static('assets'));

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).send(
        '<html><body><h1>Internal server error</h1></body></html>',
    );
});

app.listen(6123, () => {
    console.log(`layout server running at http://localhost:6123`);
});
