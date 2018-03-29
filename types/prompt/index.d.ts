declare module 'prompt' {
  class Prompt {
    message: string | null
    colors: boolean
    start (): void
    get <A> (names: string[], callback: (err: any, result: A) => void): void
  }

  const prompt: Prompt
  export = prompt
}
