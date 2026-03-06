import { cloneDeep } from "lodash";

/**
 * The default action returned by nodes when no specific branching is required.
 * When a node returns `DEFAULT_ACTION`, the flow looks for a successor registered
 * with this action string.
 */
export const DEFAULT_ACTION = "default";

/**
 * Abstract base class for all nodes in a Pocketflow graph.
 *
 * A Node represents an atomic unit of computational work. All nodes must implement
 * the three-phase lifecycle: `prep()`, `execCore()`, and `post()`.
 *
 * Nodes communicate exclusively by reading from and writing to a shared state object
 * that is passed through the graph.
 */
export abstract class BaseNode {
    /**
     * Configuration parameters passed into the node at runtime by the orchestrating Flow.
     * Useful for passing flow-level configurations (e.g., API keys, environment settings).
     */
    public flow_params: any;

    /**
     * Map of action strings to successor Nodes. Determines the routing logic.
     */
    public successors: Map<string, BaseNode>;

    constructor() {
        this.flow_params = {};
        this.successors = new Map();
    }

    /**
     * Sets the flow parameters for this node instance.
     * @param params Configuration parameters
     */
    public setParams(params: any): void {
        this.flow_params = params;
    }

    /**
     * Deep clones this node instance, its parameters, and performs a shallow clone
     * of its successor map. This is critical for preventing state contamination
     * during parallel execution.
     *
     * @returns A safe, isolated copy of the node
     */
    public clone(): BaseNode {
        const newNode = this._clone();
        newNode.flow_params = cloneDeep(this.flow_params);
        newNode.successors = new Map(this.successors);
        return newNode;
    }

    /**
     * Implemented by subclasses to return a new instance of themselves.
     * Used internally by `clone()`.
     */
    abstract _clone(): BaseNode;

    /**
     * Registers a successor node mapped to a specific action string.
     *
     * @param newSuccessor The node to execute next if the current node returns `action`
     * @param action The routing label (defaults to `DEFAULT_ACTION`)
     * @throws {Error} If a successor is already mapped to the given action string
     */
    public addSuccessor(
        newSuccessor: BaseNode,
        action: string = DEFAULT_ACTION,
    ): void {
        if (this.successors.has(action)) {
            throw new Error(`Action ${action} already exists`);
        }

        this.successors.set(action, newSuccessor);
    }

    /**
     * Retrieves a cloned instance of the successor node mapped to the given action string.
     *
     * @param name The action string returned by the `post()` method
     * @returns A fresh clone of the successor node, or undefined if no mapping exists
     */
    public getSuccessor(name: string): BaseNode | undefined {
        if (!this.successors.has(name)) {
            return undefined;
        }

        // This is important for parallel execution to not have race conditions
        return this.successors.get(name)!.clone();
    }

    /**
     * Phase 1 of the node lifecycle.
     * Extracts and validates required data from the shared state.
     *
     * @param sharedState The global state object passed through the flow
     * @returns The prepared inputs needed for `execCore()`
     */
    abstract prep(sharedState: any): Promise<any>;

    /**
     * Executes the node's core logic, wrapped with any necessary cross-cutting
     * concerns (e.g., retries, timeouts, logging). Subclasses like `RetryNode`
     * override this method to add behavior around `execCore`.
     *
     * @param prepResult Output from `prep()`
     * @returns The logical result of the execution
     */
    public execWrapper(prepResult: any): Promise<any> {
        return this.execCore(prepResult);
    }

    /**
     * Phase 2 of the node lifecycle.
     * The primary computational step (e.g., calling an LLM, querying a database).
     * Should be a pure function relative to shared state (no side effects).
     *
     * @param prepResult Output from `prep()`
     * @returns The raw execution result
     */
    abstract execCore(prepResult: any): Promise<any>;

    /**
     * Phase 3 of the node lifecycle.
     * Writes execution results back to the shared state and determines the next action.
     *
     * @param prepResult Output from `prep()`
     * @param execResult Output from `execCore()`
     * @param sharedState The global state object
     * @returns An action string used to route to the next node
     */
    abstract post(
        prepResult: any,
        execResult: any,
        sharedState: any,
    ): Promise<string>;

    /**
     * Orchestrates the node's three-phase lifecycle.
     *
     * @param sharedState The global state object passed through the flow
     * @returns The action string returned by `post()`
     */
    public async run(sharedState: any): Promise<string> {
        const prepResult = await this.prep(sharedState);
        const execResult = await this.execWrapper(prepResult);
        const action = await this.post(prepResult, execResult, sharedState);

        return action;
    }
}

/**
 * A utility node that automatically retries its `execCore` logic upon failure.
 * Useful for making LLM calls or network requests resilient.
 */
export abstract class RetryNode extends BaseNode {
    protected maxRetries: number;
    protected intervalMs: number;

    /**
     * @param maxRetries Maximum number of attempts before throwing an error
     * @param intervalMs Milliseconds to wait between attempts
     */
    constructor(maxRetries: number, intervalMs: number) {
        super();
        this.maxRetries = maxRetries;
        this.intervalMs = intervalMs;
    }

    public async execWrapper(prepResult: any): Promise<any> {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                return await this.execCore(prepResult);
            } catch (_error) {
                await new Promise((resolve) => setTimeout(resolve, this.intervalMs));
            }
        }

        throw new Error(
            "Max retries reached after " + this.maxRetries + " attempts",
        );
    }
}

/**
 * An orchestrator that walks a directed graph of nodes.
 * Since Flow extends BaseNode, flows can be nested within other flows.
 */
export class Flow extends BaseNode {
    private start: BaseNode;

    /**
     * @param start The initial node where graph execution begins
     */
    constructor(start: BaseNode) {
        super();
        this.start = start;
    }

    public _clone(): BaseNode {
        // NOTE: I don't think we need to clone the start node here
        // We copy on ready any way during execution
        return new Flow(this.start);
    }

    async getStartNode(): Promise<BaseNode> {
        // This is important for parallel execution to not have race conditions
        return this.start.clone();
    }

    async execCore(_prepResult: any): Promise<any> {
        throw new Error("Flow node does not support direct execution");
    }

    async prep(_sharedState: any): Promise<any> {
        return {}; // Pass through the shared state to exec_core
    }

    /**
     * Traverses the node graph sequentially, executing nodes and following
     * action-based routing until no successor is found.
     *
     * @param sharedState The global state object
     * @param flowParams Optional parameters injected into every executed node
     */
    async orchestrate(sharedState: any, flowParams?: any): Promise<any> {
        let currentNode: BaseNode | undefined = await this.getStartNode();
        while (currentNode) {
            currentNode.setParams(flowParams ? flowParams : this.flow_params);
            const action = await currentNode.run(sharedState);
            currentNode = currentNode.getSuccessor(action); // If undefined, the flow is complete
        }
    }

    async run(sharedState: any): Promise<string> {
        const prepResult = await this.prep(sharedState);

        await this.orchestrate(sharedState);

        // No execution result to return for a flow
        return this.post(prepResult, undefined, sharedState);
    }

    async post(
        _prepResult: any,
        _execResult: any,
        _sharedState: any,
    ): Promise<string> {
        return DEFAULT_ACTION;
    }
}

/**
 * A specialized Flow that spawns multiple concurrent executions of its inner graph.
 * `prep()` must return an array; each element triggers an independent flow execution
 * running in parallel (fan-out pattern).
 */
export class BatchFlow extends Flow {
    async prep(_sharedState: any): Promise<any[]> {
        return [];
    }

    async run(sharedState: any): Promise<string> {
        const prepResultList = await this.prep(sharedState);

        const resultPromises = [];
        for (const prepResult of prepResultList) {
            const result = this.orchestrate(sharedState, prepResult);
            resultPromises.push(result);
        }
        const resultList = await Promise.all(resultPromises);

        return this.post(prepResultList, resultList, sharedState);
    }

    async post(
        _prepResultList: any[],
        _resultList: any[],
        _sharedState: any,
    ): Promise<string> {
        return DEFAULT_ACTION;
    }
}
