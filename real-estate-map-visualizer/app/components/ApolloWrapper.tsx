'use client';

// app/components/ApolloWrapper.tsx

import { type ReactNode } from 'react';
import { ApolloClient, ApolloProvider, InMemoryCache, HttpLink } from '@apollo/client';

const client = new ApolloClient({
  link: new HttpLink({ uri: 'https://graphql.eng.meridiancapital.com/graphql' }),
  cache: new InMemoryCache(),
});

export default function ApolloWrapper({ children }: { children: ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}