'use client';

import { Theme } from "frosted-ui";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <Theme accentColor="orange" grayColor="auto" hasBackground>
      {children}
    </Theme>
  );
}
