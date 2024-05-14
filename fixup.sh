#!/usr/bin/env bash

## Append the following to types/layout.d.ts
cat >> types/layout.d.ts <<!EOF
declare global {
  namespace Express {
    export interface Response {
      podiumSend(fragment: string, ...args: unknown[]): Response;
    }
  }
}
!EOF
