import ts from 'typescript'

export interface HardcodedText {
  file: string
  line: number
  text: string
}

const VISIBLE_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'label',
  'placeholder',
  'title',
])

function containsLetters(text: string): boolean {
  return /\p{L}/u.test(text)
}

function isStringLiteral(
  node: ts.Node,
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
}

function literalsRenderedBy(expression: ts.Expression): ts.Node[] {
  if (isStringLiteral(expression) || ts.isTemplateExpression(expression)) {
    return [expression]
  }
  if (ts.isParenthesizedExpression(expression)) {
    return literalsRenderedBy(expression.expression)
  }
  if (ts.isConditionalExpression(expression)) {
    return [
      ...literalsRenderedBy(expression.whenTrue),
      ...literalsRenderedBy(expression.whenFalse),
    ]
  }
  if (
    ts.isBinaryExpression(expression) &&
    [
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
      ts.SyntaxKind.PlusToken,
    ].includes(expression.operatorToken.kind)
  ) {
    return [
      ...literalsRenderedBy(expression.left),
      ...literalsRenderedBy(expression.right),
    ]
  }
  return []
}

/**
 * Encuentra texto que el usuario vería y que no pasa por el mecanismo de traducción:
 * texto literal entre etiquetas JSX y literales en atributos que el navegador muestra o anuncia.
 */
export function findHardcodedTexts(
  fileName: string,
  sourceCode: string,
): HardcodedText[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const findings: HardcodedText[] = []

  function report(node: ts.Node, text: string) {
    if (!containsLetters(text)) return
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    findings.push({ file: fileName, line: line + 1, text: text.trim() })
  }

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      report(node, node.text)
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      !ts.isJsxAttribute(node.parent)
    ) {
      for (const literal of literalsRenderedBy(node.expression)) {
        report(literal, literal.getText())
      }
    } else if (
      ts.isJsxAttribute(node) &&
      VISIBLE_ATTRIBUTES.has(node.name.getText()) &&
      node.initializer
    ) {
      if (ts.isStringLiteral(node.initializer)) {
        report(node.initializer, node.initializer.text)
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression
      ) {
        for (const literal of literalsRenderedBy(node.initializer.expression)) {
          report(literal, literal.getText())
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return findings
}
