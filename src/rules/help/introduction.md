---
title: Introduction
group: Rule engine
# category: Caching And Stores
---

## What is a Rule Engine

A rule engine is a tool that performs actions on behalf of the application based on declarative logic that does not reside in the code base.

Rules are read into the engine and invoked against any given input data. The results are returned to the application. Engines do not change persistent data or lead to data loss.

It separates business logic from the application code, enabling them to be edited or expanded without rebuilding the application.

It therefore enables stakeholders to change system behavior when requirements change, without needing full knowledge of the code or technology stack. 

## When to use a Rule Engine

- If the logic is too complex that encoding it would lead to unreadable code or complex design.

- If the logic is used in multiple places (e.g. in workflows) and repeating blocks would appear.

- If the logic is liable to change at any time (more likely to change than the business model).

- If the system is designed to be generic enough to satisfy multiple scenarios, each with slightly different needs.

## When can Rule engines fail

- If the declarative syntax is too cumbersome or hard to maintain, the cost of keeping up rules can keep growing.

- Conflicting rules can lead to indeterministic results based on the order of rule invocation.

- If rules are highly inter-dependent, altering one rule may change the outcome of others in unexpected ways. This undeterministic behaviour can reduce reliability or create issues.

- If rules are poorly written, or the engine does not provide insight into its operations, unexpected results can arise and be difficult to audit or fix.

- If rules do not match the data model (e.g. when the data model changes or when the engine cannot check data types for validity) rules may fail leading to unexpected changes in behaviour.

- Too many rules can lead to poorly implemented engines slowing down and affecting system performance at every invocation.

## Quality features of Rule engines

To enable teams to benefit, and prevent failures from happening, the best rule engines provide the following features:

### At design time

- Clear and intuitive syntax for declaring rules.

- Sandboxes for testing rules before deployment to production. Rules are applied in bulk only when tested to work together as expected.

- Declarative input and output models that can validate rules to ensure they match application models.

- Audit features such as a clear audit chain of invoked rules and debug logs for troubleshooting issues.

### At run time

- Performant algorithms to ensure fast execution of only relevant rules.

- Data validation of inputs to ensure no misleading results are returned.

- Conflict resolution by respecting the priority (salience) of rules. More specific (or critical) rules override more general (or default) rules.

- Forward chaining of rule invocation to ensure that all dependent rules are invoked in order.

- Rich return data including original inputs, final outputs, and the rules invoked in order for a complete audit trail.

## Well-known Rule engines

