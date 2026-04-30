---
title: Declared Components
group: Rule engine
# category: Caching And Stores
---

# Declared Components

To configure the Rule engine, you need to declare your business logic in the form of any ofd these declaraive components


# Types of Rules

The general format underlying any rule in a Rule engine is:

```
IF <condition> THEN <action>
```

However, rules can be tuned to be more expressive. The syntax can declare meaningful rules that more closely resemble requirements.

## State Variables

These are values calculated based on input data without a condition.

They are declared as: 
```
SET person.is_adult = person.age >= 21
```

- State variables are set whenever the input data enables their calculation. For example, the state of a hotel room is set every time room data is provided in the input.

- State variables therefore differ from one invocation to the next. They are useful to flag different modes of operation for other rules.

## Exception Rules

Exceptions can be thrown if a condition is met. For example if the buyer of a ticket is under a certain age, an exception is thrown preventing further rule execution.

They are declared as:
```
IF buyer.age < 21 THROW Only adults can buy tickets
```

### Conditional Rules

Conditional rules must first evaluate an expression before performing any action.

They are declared as:
```
IF person.age >= 21 
THEN person.is_adult = TRUE 
ELSE person.is_adult = FALSE
```

- IF-THEN rules evaluate a condition and if satisfied execute an action.

- IF-THEN-ELSE rules also evaluate a condition and perform one action if satisified or an alternative action if not satisfied.


# Additional Declarations

In addition to rules, the Rule engine supports other declarations that provide additional functionality but are not strictly rules.

## Constants

These may be called rules in a sense that they can be declared. However, they are declared simply as: 
```
PI = 3.14
```

- Constants always have the same value across invocations. These can be physical constants, legal limits, fixed percentages, etc. 

- Constants can be used by rules but never modified by them.

## Declared Functions

To simplify rule syntax, common calculations can be declared as custom functions in one place. 

They are declared as: 
```
sales_tax(total: number) {
    tax_rate = (total < 100)? 0.12 : 0.14;
    tax = total * tax_rate;
    return max(1, tax)
}
```
or simply if in one line:
```
greeting(name: string) = concat('Hello ', name)
```

- Each function has a unique name, accepts atomic data types (string, number, boolean, opr date) and returns a single atomic atomic value.

- Rules can then use functions in their syntax and pass in the correct parameters to get the return value.

- Rules can be simple 

- Functions cannot directly access inputs beyond the parameters passed to them. They also cannot directly change of affect output.

- The engine already provides many built-in functions for common tasks. A custom function cannot override a built-in function to avoid unexpected behaviour from arising.

## Declared Types

To ensure data validity, input (and optionally) output types can be declared before any rules are processed.

They are declared as:
```
person {
    name: string,
    age: number,
    address: {
        city: string,
        state: string
    }
}
```

- The declared types define how named objects are structured and the data type of each field/property.

- At design time the engine ensures that all variables referenced in rules are declared and have the same type as declared. This catches malformed rules before they are deployed.

- At run time, the engine ensures all input data confirms to the expected types. This ensures no rule failures or unexpected results arise due to type mismatches.

- If the application changes the data it sends or expects from the Rule engine, these changes must be made to the declared types. The engine will validate all existing rules against the new types and can only be deployed if no issues are met.
