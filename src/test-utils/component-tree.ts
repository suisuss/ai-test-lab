/**
 * React Component Tree Serializer
 *
 * Walks the React fiber tree and produces a simplified JSON representation
 * of the component hierarchy. Accessed by Playwright tests via
 * window.__TEST_COMPONENT_TREE__.
 *
 * Next.js 16 App Router uses a segment trie that can leave gaps in the
 * fiber child chain. To handle this, the serializer uses a two-pass approach:
 * 1. Standard fiber walk from root (gets framework components)
 * 2. DOM-based fiber discovery (finds page components in segment sub-trees)
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

function getFiberFromElement(el: Element): any | null {
  const fiberKey = Object.keys(el).find((key) =>
    key.startsWith("__reactFiber$")
  );
  return fiberKey ? (el as any)[fiberKey] : null;
}

function getFiberName(fiber: any): string | null {
  return fiber?.type?.displayName ||
    fiber?.type?.name ||
    (typeof fiber?.type === "string" ? fiber.type : null);
}

function collectFiberChildren(fiber: any, depth: number, visited: Set<any>): SerializedNode[] {
  const results: SerializedNode[] = [];
  let child = fiber.child;
  while (child) {
    results.push(...walkFiber(child, depth, visited));
    child = child.sibling;
  }
  return results;
}

function walkFiber(fiber: any, depth = 0, visited = new Set<any>()): SerializedNode[] {
  if (!fiber || depth > 50 || visited.has(fiber)) return [];
  visited.add(fiber);

  const isComponent =
    typeof fiber.type === "function" || typeof fiber.type === "object";

  const name = getFiberName(fiber);

  if (!name) {
    return collectFiberChildren(fiber, depth, visited);
  }

  const domNode = fiber.stateNode instanceof Element ? fiber.stateNode : null;

  const node: SerializedNode = {
    type: name,
    props: isComponent && fiber.memoizedProps
      ? sanitizeProps(fiber.memoizedProps)
      : {},
    aria: getAriaAttributes(domNode),
    children: collectFiberChildren(fiber, depth + 1, visited),
  };

  return [node];
}

/**
 * Find disconnected fiber sub-trees by scanning DOM elements.
 * Returns fibers that have a .return chain passing through the visited set
 * but weren't reachable via .child pointers (segment boundary gaps).
 */
function findDisconnectedSubtrees(visited: Set<any>): any[] {
  const subtreeRoots: any[] = [];
  const seen = new Set<any>();

  const allElements = document.querySelectorAll("*");
  for (const el of Array.from(allElements)) {
    const fiber = getFiberFromElement(el as Element);
    if (!fiber || visited.has(fiber) || seen.has(fiber)) continue;
    seen.add(fiber);

    // Walk up from this fiber to find the highest unvisited ancestor
    // whose parent IS in the visited set (the gap boundary)
    let highest = fiber;
    let current = fiber;
    while (current.return) {
      if (visited.has(current.return)) {
        // Found the gap — current is the root of the disconnected sub-tree
        highest = current;
        break;
      }
      if (!visited.has(current)) {
        highest = current;
      }
      current = current.return;
    }

    if (!seen.has(highest)) {
      seen.add(highest);
      subtreeRoots.push(highest);
    }
  }

  return subtreeRoots;
}

function findFiberRoot(): any | null {
  const candidates = [
    document.getElementById("__next"),
    document.body,
    document.documentElement,
  ];

  for (const el of candidates) {
    if (!el) continue;
    const fiber = getFiberFromElement(el);
    if (!fiber) continue;

    let root = fiber;
    while (root.return) {
      root = root.return;
    }
    return root;
  }
  return null;
}

function findNodeByType(node: SerializedNode, name: string): SerializedNode | null {
  if (node.type === name) return node;
  for (const child of node.children) {
    const found = findNodeByType(child, name);
    if (found) return found;
  }
  return null;
}

export function serializeComponentTree(): SerializedNode | null {
  const root = findFiberRoot();
  if (!root) return null;

  // Pass 1: standard fiber tree walk
  const visited = new Set<any>();
  const nodes = walkFiber(root.child || root, 0, visited);

  // Pass 2: find disconnected sub-trees (page components behind segment boundaries)
  const disconnected = findDisconnectedSubtrees(visited);
  for (const subtreeRoot of disconnected) {
    const subtreeNodes = walkFiber(subtreeRoot, 0, visited);
    if (subtreeNodes.length > 0) {
      // Try to attach these nodes to their parent in the existing tree
      // by finding the parent node in the tree that corresponds to
      // the subtree root's .return fiber
      let parentFiber = subtreeRoot.return;
      let attached = false;
      while (parentFiber && !attached) {
        const parentName = getFiberName(parentFiber);
        if (parentName) {
          // Find this parent in our serialized tree and append children
          for (const node of nodes) {
            const parentNode = findNodeByType(node, parentName);
            if (parentNode) {
              parentNode.children.push(...subtreeNodes);
              attached = true;
              break;
            }
          }
        }
        parentFiber = parentFiber.return;
      }

      // If we couldn't attach, add as top-level nodes
      if (!attached) {
        nodes.push(...subtreeNodes);
      }
    }
  }

  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  return { type: "Root", props: {}, aria: {}, children: nodes };
}

export function installComponentTreeInspector() {
  if (typeof window === "undefined") return;
  (window as any).__TEST_COMPONENT_TREE__ = () => serializeComponentTree();
}
