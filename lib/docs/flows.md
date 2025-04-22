# Library Lifecycle and Monitoring Flow Documentation

## 1. Global Library Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    title Library Lifecycle Sequence Diagram
    participant User
    participant NodeSupervisor
    participant Node
    participant NodeStatusManager
    participant MonitoringAgent
    participant RemoteService
    participant MonitoringSignalHandler

    User->>NodeSupervisor: Deploy chain (config, data)
    NodeSupervisor->>NodeSupervisor: Create chain and store config
    NodeSupervisor->>Node: Set up the first node (index = 0)
    Node->>NodeStatusManager: Initialize with signal queue
    Node->>MonitoringAgent: Emit NODE_SETUP_COMPLETED (local-signal)
    MonitoringAgent->>MonitoringAgent: Increment setupCount[chainId]
    
    loop For each node in the chain
        alt Node location = local
            NodeSupervisor->>Node: Set up the next local node
            Node->>NodeStatusManager: Configure signal handlers
            Node->>MonitoringAgent: NODE_SETUP_COMPLETED
        else Node location = remote
            NodeSupervisor->>RemoteService: Broadcast setup signal
            RemoteService-->>NodeSupervisor: Node setup confirmation
        end
    end
    
    MonitoringAgent->>MonitoringSignalHandler: Check setupCount[chainId] == totalNodes
    MonitoringSignalHandler->>NodeSupervisor: StartPendingChain(chainId)
    NodeSupervisor->>Node: Execute first node with data
    Node->>NodeStatusManager: Check signal queue
    Node->>Node: Process data through pipelines
    alt Processing successful
        Node->>MonitoringAgent: NODE_COMPLETED
        Node->>NextNode: Send processed data
    else Processing failed
        Node->>NodeStatusManager: Handle error
        NodeStatusManager->>MonitoringAgent: NODE_FAILED
        MonitoringAgent->>User: Send alert
    end
```

## 2. Monitoring/Reporting Flow Sequence Diagram

```mermaid
sequenceDiagram
    title Detailed Monitoring/Reporting Sequence Flow
    participant Node
    participant NodeStatusManager
    participant ReportingAgent
    participant MonitoringAgent
    participant HostResolver
    participant CallbackService
    participant NodeSupervisor

    Node->>NodeStatusManager: Emit internal signal (e.g., SUSPEND)
    Node->>ReportingAgent: Emit signal (local/global)
    NodeStatusManager->>NodeStatusManager: Update status queue
    
    alt Signal Type = local-signal
        ReportingAgent->>MonitoringAgent: Update status map
        MonitoringAgent-->>MonitoringAgent: Merge statuses
    else Signal Type = global-signal
        ReportingAgent->>MonitoringAgent: Handle callback
    end
    
    alt Signal requires external processing
        MonitoringAgent->>HostResolver: Resolve monitoring host
        HostResolver-->>MonitoringAgent: Return URL
        MonitoringAgent->>CallbackService: POST /notify
        CallbackService-->>MonitoringAgent: HTTP response
    end
    
    loop Heartbeat monitoring
        MonitoringAgent->>NodeStatusManager: Status check
        NodeStatusManager-->>MonitoringAgent: Current status and queue state
        alt Status = NODE_FAILED
            MonitoringAgent->>NodeSupervisor: Restart node
        end
    end
```

## 2a. Callbacks Flow Sequence Diagram

```mermaid
sequenceDiagram
    title Callback Interactions Sequence Diagram
    participant Node
    participant NodeSupervisor
    participant ReportingAgent
    participant ProcessorCallback
    participant ReportingCallback
    participant SetupCallback
    participant RemoteNodes
    participant MonitoringAgent

    Note over Node,ProcessorCallback: Pipeline Processing Flow
    Node->>ProcessorCallback: Remote service invocation (targetId, meta)
    ProcessorCallback-->>Node: Return processed data
    
    Note over Node,ReportingCallback: Status Reporting Flow
    Node->>ReportingAgent: Emit signal (local/global)
    ReportingAgent->>ReportingCallback: Forward status notification
    ReportingCallback->>MonitoringAgent: HTTP POST /notify
    
    Note over NodeSupervisor,RemoteNodes: Chain Initialization Flow
    NodeSupervisor->>SetupCallback: Broadcast node setup (chainId, config)
    SetupCallback->>RemoteNodes: Distribute configuration
    RemoteNodes-->>SetupCallback: Setup confirmation
```

## 3. Signal Handling Flow

```mermaid
sequenceDiagram
    title Node Signal Handling Sequence Flow
    participant ExternalService
    participant NodeSupervisor
    participant Node
    participant NodeStatusManager
    participant MonitoringAgent

    ExternalService->>NodeSupervisor: POST /node/resume {chainId, targetId}
    NodeSupervisor->>Node: Find target node
    Node->>NodeStatusManager: Enqueue RESUME signal
    NodeStatusManager->>NodeStatusManager: Process signal queue
    alt Suspended state exists
        NodeStatusManager->>Node: Resume execution
        Node->>MonitoringAgent: NODE_RESUMED
        MonitoringAgent->>ExternalService: Confirm resume
    else No suspended state
        NodeStatusManager->>MonitoringAgent: Error: Nothing to resume
        MonitoringAgent->>ExternalService: Return error
    end
```

## 4. Global Lifecycle Flowchart

```mermaid
flowchart TD
    A[Start: Chain Deployment] --> B[NodeSupervisor: Create Chain]
    B --> C[Set up the first node index = 0]
    C --> D{Node Type?}
    D -->|Local| E[Initialize Local Node]
    D -->|Remote| F[Broadcast Setup Signal]
    
    E --> G[MonitoringAgent: Increment setupCount]
    F --> H[Remote Service Confirmation]
    
    G --> I{All nodes set up?}
    H --> I
    I -->|Yes| J[Start Chain Execution]
    I -->|No| C
    
    J --> K[Node Processing]
    K --> L{Processing Result}
    L -->|Success| M[Send to Next Node]
    L -->|Failure| N[Alert & Retry]
    
    M --> O{More Nodes?}
    N --> O
    O -->|Yes| K
    O -->|No| P[End: Chain Complete]
```

## 5. Monitoring Flowchart

```mermaid
flowchart TD
    A[Node Status Change] --> B{Emit Signal Type?}
    B -->|local-signal| C[Update Local Status]
    B -->|global-signal| D[Process External Callback]
    
    C --> E[Store in status Map]
    E --> F{Is Critical Status?}
    F -->|Yes| G[Trigger Global Signal]
    F -->|No| H[Log Status]
    
    D --> I{Node Index > 0?}
    I -->|Yes| J[Resolve Monitoring Host]
    I -->|No| K[Direct Signal Handling]
    
    J --> L{Found Host?}
    L -->|Yes| M[POST /notify via CallbackService]
    L -->|No| N[Error: Host Resolution Failed]
    
    K --> O[Update setupCount]
    O --> P{setupCount >= Total Nodes?}
    P -->|Yes| Q[Start Pending Chain]
    P -->|No| R[Wait for More Nodes]
    
    subgraph Monitoring Agent
        S[Receive Signal] --> T{Signal Type?}
        T -->|NODE_SETUP_COMPLETED| U[Increment setupCount]
        T -->|NODE_FAILED| V[Trigger Alerts]
        U --> W{All Nodes Ready?}
        W -->|Yes| X[Signal Chain Start]
    end
    
    subgraph Host Resolution
        J --> Y[Check remoteMonitoringHost Map]
        Y --> Z[Return URL or Error]
    end
```

## Key Components Explanation

1. **Node**: The basic processing unit that executes pipelines and emits status signals.
2. **ReportingAgent**: Mediator between nodes and the MonitoringAgent.
3. **MonitoringAgent**: Central hub for status tracking and decision making.
4. **HostResolver**: Resolves monitoring endpoints based on chain ID.
5. **Callback Services** (Multiple Purposes):
   - *Reporting Callback* (`ReportingCallback`): HTTP service for monitoring notifications.
   - *Processor Callback* (`ProcessorCallback`): Encapsulates remote services in pipelines.
   - *Setup Callback* (`SetupCallback`): Handles node initialization signals.
6. **MonitoringSignalHandler**: Special handler for chain setup completion.
7. **NodeSupervisor**: Orchestrates node lifecycle and chain execution.

**Critical Decision Points:**
- `index > 0`: Determines if broadcast is needed (non-initiator nodes).
- `setupCount >= totalNodes`: Chain start condition check.
- `Critical Status`: Determines if escalation is needed.
- `Node Type`: Differentiates local versus remote handling.

## Callback Services Taxonomy

| Callback Type     | Scope          | Protocol | Responsibility                        | Example Usage         |
|-------------------|----------------|----------|---------------------------------------|-----------------------|
| ProcessorCallback | Pipeline level | Any      | Remote service encapsulation          | Data transformation   |
| ReportingCallback | Monitoring     | HTTP     | Node status notifications             | NODE_FAILED alerts    |
| SetupCallback     | Initialization | HTTP     | Node configuration broadcasting       | Chain deployment      |
