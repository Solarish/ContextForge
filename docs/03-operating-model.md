# Operating model

Register each project in the JSON registry. Keep canonical facts in that project's Report and linked navigation in its Wiki. Agents select `projectId`, request compact context, read chosen source headings, validate required documents, and refresh the index after edits. Human-facing HTML reports are created with `report_create` and found through `report_list`.

Use the private MCP for production status and guarded env changes. Check scope, protected-key reason and audit result. Never put raw secrets or personal records in agent-visible output. Multiple Claude sessions can use the same context gateway concurrently without shared session state or role routing. Each session follows its user-assigned task.
