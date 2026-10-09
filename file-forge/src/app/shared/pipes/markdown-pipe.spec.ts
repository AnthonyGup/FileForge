import { MarkdownPipe } from './markdown-pipe';

describe('MarkdownPipe', () => {
  const pipe = new MarkdownPipe();

  it('devuelve cadena vacía para null/undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('renderiza encabezados de todos los niveles', () => {
    expect(pipe.transform('# Título')).toBe('<h1>Título</h1>');
    expect(pipe.transform('### Sub')).toBe('<h3>Sub</h3>');
  });

  it('renderiza negrita, cursiva y código en línea', () => {
    expect(pipe.transform('**fuerte** y *suave* y `x = 1`'))
      .toBe('<p><strong>fuerte</strong> y <em>suave</em> y <code>x = 1</code></p>');
  });

  it('renderiza listas desordenadas y ordenadas', () => {
    expect(pipe.transform('- uno\n- dos')).toBe('<ul><li>uno</li><li>dos</li></ul>');
    expect(pipe.transform('1. uno\n2. dos')).toBe('<ol><li>uno</li><li>dos</li></ol>');
  });

  it('renderiza citas, reglas y bloques de código', () => {
    expect(pipe.transform('> nota')).toBe('<blockquote>nota</blockquote>');
    expect(pipe.transform('---')).toBe('<hr />');
    expect(pipe.transform('```\nconst a = 1;\n```')).toBe('<pre><code>const a = 1;</code></pre>');
  });

  it('renderiza enlaces y descarta esquemas peligrosos', () => {
    expect(pipe.transform('[FileForge](https://example.com)'))
      .toBe('<p><a href="https://example.com" rel="noopener">FileForge</a></p>');
    expect(pipe.transform('[x](javascript:alert)'))
      .toBe('<p><a href="#" rel="noopener">x</a></p>');
  });

  it('escapa el HTML de entrada', () => {
    expect(pipe.transform('<script>alert(1)</script>'))
      .toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });
});
