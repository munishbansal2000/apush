import React, { createContext, useContext } from 'react';

type LibraryTone = 'playful' | 'serious';
const Ctx = createContext<LibraryTone>('playful');
export const ToneProvider: React.FC<{ tone: LibraryTone; children: React.ReactNode }> = ({ tone, children }) => <Ctx.Provider value={tone}>{children}</Ctx.Provider>;
export const useTone = () => useContext(Ctx);
