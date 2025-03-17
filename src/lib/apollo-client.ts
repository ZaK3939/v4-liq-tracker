import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// Envioのインデクサーエンドポイントを指定
const ENVIO_API_URL = process.env.NEXT_PUBLIC_ENVIO_API_URL || 'http://localhost:8080/v1/graphql';

const httpLink = new HttpLink({
  uri: ENVIO_API_URL,
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          pools: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          swaps: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
    },
  },
});
