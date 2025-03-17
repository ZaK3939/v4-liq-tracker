import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ApolloProvider } from "@apollo/client";
import { client } from "../lib/apollo-client";
import Head from "next/head";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider client={client}>
      <Head>
        <title>Uniswap v4 流動性トラッカー</title>
        <meta
          name="description"
          content="Uniswap v4プールの流動性推移を時系列で確認できるUI"
        />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-blue-600 shadow-md">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-white">
                Uniswap v4 流動性トラッカー
              </h1>
              <a
                href="https://github.com/enviodev/uniswap-v4-indexer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-blue-100 text-sm"
              >
                GitHub
              </a>
            </div>
          </div>
        </header>
        <main>
          <Component {...pageProps} />
        </main>
        <footer className="bg-white border-t mt-10 py-6">
          <div className="container mx-auto px-4 text-center text-gray-500">
            <p className="text-sm">
              © {new Date().getFullYear()} Uniswap v4 流動性トラッカー |
              Powered by Envio
            </p>
          </div>
        </footer>
      </div>
    </ApolloProvider>
  );
}

export default MyApp;
