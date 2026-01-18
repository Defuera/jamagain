# UI Components Guide

Rules for using and creating UI components.

## File Structure

- `components.js` - Reusable UI component factories
- `components/` - Standalone component modules
- `utils.js` - Formatting utilities (formatCurrency, formatDate, etc.)
- `{page}.js` - Page-specific logic

## Using Components

- ALWAYS check component source for config options
- ALWAYS pass `containerId` to identify target element

## Creating Components

- MUST use factory pattern: `createComponentName(config)`
- MUST accept config object: `{ containerId, data, options }`
- MUST return API object with `update()` and `destroy()` methods
- MUST check container exists before rendering
- PREFER utils.js functions for formatting

## Page Structure

- Define state at top
- Load data with async `loadData()`
- Render using component factories
- Initialize on `DOMContentLoaded`
