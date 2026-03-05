[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  
[![Docs](https://img.shields.io/badge/docs-latest-blue)](https://osly-ai.github.io/Pocket-Flow-Framework/)
[![Tests](https://img.shields.io/badge/tests-28%20passing-brightgreen)]()

# 🚀 Pocketflow Framework

**The original core abstraction behind the [Pocketflow Platform](https://pocketflow.ai/)**  
Enabling non‑developers to create custom AI workflows with natural language.

## Overview

This repo contains the **original Pocketflow Framework**—a Nested Directed Graph engine that models LLM workflows as composable nodes and flows. It provides a consistent execution model, state management layer, and built-in support for retries, batching, and parallel execution.

We started development in November. The Python version was open‑sourced in December with Zach—who later spun it off as his own project. The TypeScript release followed in February.

## Platform Snapshot

<p align="center">
  <img src="./assets/landing.png" alt="Pocketflow workflow UI" width="700"/>
</p>

## Architecture

We model LLM workflows as a **Nested Directed Graph** where:

- 🔹 **Nodes** handle atomic LLM tasks
- 🔗 **Actions** connect nodes (labeled edges) for agent behavior
- 🔄 **Flows** orchestrate node graphs for task decomposition
- 📦 **Nesting** allows flows to be used as nodes
- 📊 **Batch** processing for data-intensive tasks
- ⚡ **Async** support for parallel execution

<p align="center">
  <img src="./assets/arc.png" alt="Shared state and node flow diagram" width="700"/>
</p>

## Why This Framework?

- **Nested Directed Graph** — Breaks complex tasks into reusable nodes with branching and recursion.  
- **One‑Shot Assembly** — Core abstraction powering prompt‑based workflow creation.  
- **Vendor‑Agnostic** — Integrate any LLM or API without extra wrappers.  
- **Debug-Friendly** — Inspect state and trace execution paths easily.  

## Quick Start

```bash
git clone https://github.com/Osly-AI/Pocket-Flow-Framework.git
cd Pocket-Flow-Framework
npm install
```

### Run tests

```bash
npm test
```

### Build

```bash
npm run build
```

## Usage

Every node implements three lifecycle methods:

```typescript
import { BaseNode, Flow, DEFAULT_ACTION } from "pocketflow";

class SummarizeNode extends BaseNode {
  // 1. Prepare — pull data from shared state
  async prep(sharedState: any) {
    return { text: sharedState.inputText };
  }

  // 2. Execute — do the actual work
  async execCore(prepResult: any) {
    const summary = await callYourLLM(prepResult.text);
    return { summary };
  }

  // 3. Post — write results back, decide next action
  async post(prepResult: any, execResult: any, sharedState: any) {
    sharedState.summary = execResult.summary;
    return DEFAULT_ACTION;
  }

  _clone(): BaseNode {
    return new SummarizeNode();
  }
}

// Wire nodes together
const summarize = new SummarizeNode();
const review = new ReviewNode();
summarize.addSuccessor(review, DEFAULT_ACTION);

// Run the flow
const flow = new Flow(summarize);
await flow.run({ inputText: "Your long document here..." });
```

### RetryNode

Built-in retry with backoff:

```typescript
class ResilientNode extends RetryNode {
  constructor() {
    super(3, 1000); // 3 retries, 1s between attempts
  }
  // ...implement prep, execCore, post as usual
}
```

### BatchFlow

Process multiple items in parallel:

```typescript
class ProcessFiles extends BatchFlow {
  async prep(sharedState: any) {
    return sharedState.files; // Return array → each item gets its own flow run
  }
}
```

## CLI

Scaffold new nodes and flows quickly:

```bash
npx pocket new node MyProcessor
npx pocket new flow MyPipeline
```

## Project Structure

```
├── src/
│   └── pocket.ts          # Core framework (BaseNode, Flow, BatchFlow, RetryNode)
├── tests/
│   ├── pocket.test.ts     # Test suite (28 tests, ~99% coverage)
│   └── testNodes.ts       # Test helper nodes
├── cli/                   # CLI scaffolding tool
├── examples/              # Example projects
│   └── mcp-addition-ts/   # MCP addition example
└── docs/                  # MkDocs documentation site
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
