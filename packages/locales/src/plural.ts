/**
 * Writes a number with the word form matching the language's plural rule ("1 message",
 * "2 messages"; in French 0 is singular too). The rule comes from `Intl.PluralRules`, so the
 * locale files contain no language-specific conditions.
 */
export function countWith(locale: string): (count: number, one: string, other: string) => string {
  const rules = new Intl.PluralRules(locale);
  return (count, one, other) => `${count} ${rules.select(count) === 'one' ? one : other}`;
}
