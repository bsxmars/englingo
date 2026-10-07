// YAML for course files: every scalar keeps its source text, so
// `answers: [007]` is "007" and `q: 1.50` is "1.50", not numbers. Fields that
// are numbers are coerced by the schemas.
import { isScalar, parseDocument, visit } from 'yaml';

export function parseYAML(src: string): unknown {
  const doc = parseDocument(src, { uniqueKeys: true });
  if (doc.errors.length > 0) throw doc.errors[0];
  visit(doc, {
    Scalar(_, node) {
      if (isScalar(node) && (typeof node.value === 'number' || typeof node.value === 'boolean') && node.range) {
        node.value = src.slice(node.range[0], node.range[1]);
      }
    },
  });
  return doc.toJS();
}
