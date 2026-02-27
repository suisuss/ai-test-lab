/**
 * React Component Tree Serializer
 *
 * Walks the React fiber tree from the root and produces a simplified
 * JSON representation of the component hierarchy. This is injected
 * into the page in development mode and accessed by Playwright tests
 * via window.__TEST_COMPONENT_TREE__.
 *
 * The serializer captures:
 * - Component names (function/class names)
 * - Props (sanitized — no functions, no children, no circular refs)
 * - Aria attributes from the rendered DOM node
 * - Children components
 */

type SerializedNode = {
  type: string;
  props: Record<string, unknown>;
  aria: Record<string, string>;
  children: SerializedNode[];
};

function getAriaAttributes(domNode: Element | null): Record<string, string> {
  if (!domNode) return {};
  const aria: Record<string, string> = {};
  for (const attr of Array.from(domNode.attributes)) {
    if (attr.name.startsWith("aria-") || attr.name === "role") {
      aria[attr.name] = attr.value;
    }
  }
  return aria;
}

function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "children") continue;
    if (typeof value === "function") {
      sanitized[key] = "[function]";
    } else if (typeof value === "object" && value !== null) {
      try {
        JSON.stringify(value);
        sanitized[key] = value;
      } catch {
        sanitized[key] = "[circular]";
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Walk a fiber node and return an array of serialized nodes.
 * Unnamed wrappers (React contexts, providers, fragments) are "flattened through" —
 * their children are promoted into the parent's children array.
 *
 * Depth only increments for NAMED nodes (components and DOM elements),
 * not for anonymous wrappers. This ensures we can traverse deep
 * Next.js/React provider chains without hitting depth limits.
 */
function collectFiberChildren(fiber: any, depth: number): SerializedNode[] {
  const results: SerializedNode[] = [];
  let child = fiber.child;
  while (child) {
    results.push(...walkFiber(child, depth));
    child = child.sibling;
  }
  return results;
}

function walkFiber(fiber: any, depth = 0): SerializedNode[] {
  if (!fiber || depth > 80) return [];

  const isComponent =
    typeof fiber.type === "function" || typeof fiber.type === "object";

  const name =
    fiber.type?.displayName ||
    fiber.type?.name ||
    (typeof fiber.type === "string" ? fiber.type : null);

  if (!name) {
    // Unnamed wrapper — flatten through, promote children (don't increment depth)
    return collectFiberChildren(fiber, depth);
  }

  const domNode = fiber.stateNode instanceof Element ? fiber.stateNode : null;

  const node: SerializedNode = {
    type: name,
    props: isComponent && fiber.memoizedProps
      ? sanitizeProps(fiber.memoizedProps)
      : {},
    aria: getAriaAttributes(domNode),
    children: collectFiberChildren(fiber, depth + 1),
  };

  return [node];
}

function findFiberRoot(): any | null {
  // React 19 + Next.js App Router mounts at <html>, not #__next
  // Try multiple candidates in order of specificity
  const candidates = [
    document.getElementById("__next"),
    document.body,
    document.documentElement,
  ];

  for (const el of candidates) {
    if (!el) continue;
    const fiberKey = Object.keys(el).find((key) =>
      key.startsWith("__reactFiber$")
    );
    if (fiberKey) {
      return (el as any)[fiberKey];
    }
  }
  return null;
}

export function serializeComponentTree(): SerializedNode | null {
  const fiber = findFiberRoot();
  if (!fiber) return null;

  // Walk up to the true root of the fiber tree
  let root = fiber;
  while (root.return) {
    root = root.return;
  }

  // Walk down from root — walkFiber now returns an array
  const nodes = walkFiber(root.child || root);
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  // Multiple roots — wrap in a synthetic root
  return { type: "Root", props: {}, aria: {}, children: nodes };
}

export function installComponentTreeInspector() {
  if (typeof window === "undefined") return;
  (window as any).__TEST_COMPONENT_TREE__ = () => serializeComponentTree();
}
