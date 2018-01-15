export function namespaced (namespace: string|null|undefined, kind: string): string {
  let result = kind
  if (namespace) {
    result = namespace + ':' + kind
  }
  return result
}
