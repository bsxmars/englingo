import { describe, expect, it } from 'vitest';
import { inline, markdown, WORD_JOINER as wj } from './markdown.ts';

describe('markdown', () => {
  it('makes bold work next to letters and punctuation', () => {
    const cases: [string, string][] = [
      // contraction: only the changing part is bold
      ["I**'m working**", `I<strong>${wj}’m working</strong>`],
      // a punctuation mark itself is the point
      ['*Sales fell**;** however**,** profits rose*', `fell<strong>${wj};</strong> however<strong>${wj},</strong>`],
      ['*where she lives**?*** но', `lives<strong>${wj}?</strong></em>`],
      // closer after an elision, before a letter
      ["un verre **d'**eau", `un verre <strong>d’${wj}</strong>eau`],
      // ordinary bold and closers are untouched
      ['I **work**, she **works**', 'I <strong>work</strong>, she <strong>works</strong>'],
      // code keeps its asterisks as written
      ["`a**'b**`", `<code class="aura-code">a**'b**</code>`],
      ["```\nI**'m**\n```", "I**'m**"],
    ];
    for (const [src, want] of cases) expect(markdown(src)).toContain(want);
  });

  it('maps elements onto Aura classes', () => {
    expect(markdown('> note')).toContain('<div class="aura-alert aura-alert--accent" role="note"><div class="aura-alert__body">');
    expect(markdown('- a')).toContain('<ul class="aura-list">');
    expect(markdown('| a |\n|---|\n| b |')).toContain('<div class="aura-table-wrap"><table class="aura-table">');
    expect(markdown('~~no~~')).toContain('<del>no</del>');
  });

  it('typesets dashes and ellipsis but not (c)', () => {
    expect(markdown('a -- b --- c... (c)')).toBe('<p>a – b — c… (c)</p>\n');
  });

  it('hides exercise fences and renders quizzes', () => {
    expect(markdown('```exercise x\n```\n')).toBe('');
    const h = markdown('```quiz\nq: "Who?"\noptions: [a, "**b**"]\nanswer: 1\nexplain: Because.\n```\n');
    expect(h).toContain('data-correct="false">a</button>');
    expect(h).toContain('data-correct="true"><strong>b</strong></button>');
    expect(h).toContain('<p>Because.</p>');
    expect(() => markdown('```quiz\nq: x\noptions: [a]\nanswer: 3\n```\n')).toThrow(/out of range/);
  });

  it('drops the paragraph of an inline fragment', () => {
    expect(inline('a *b*')).toBe('a <em>b</em>');
    expect(inline('a\n\nb')).toBe('<p>a</p>\n<p>b</p>');
  });

  it('escapes raw HTML', () => {
    expect(markdown('<script>x</script>')).toContain('&lt;script&gt;');
  });
});
