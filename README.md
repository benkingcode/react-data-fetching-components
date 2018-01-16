This package allows you to add a `getInitialData` method to your React components, no matter how deeply they are nested. It also works seamlessly with Server-Side Rendering and rehydration.

# Installation

`yarn install react-data-fetching-components`

# Usage

Wrap any components you want to fetch data for with the `withInitialData` HOC, and add a static method `getInitialData` to the class. This method should return a Promise, or be set to an async function. Here's an example component;

```jsx
import React, { Component } from 'react';
import { withInitialData } from 'react-data-fetching-components';

class Page extends Component {
  static async getInitialData(props) {
    const res = await fetch('...');
    const json = await res.json();

    return json;
  }

  render() {
    return <div>{this.props.data}</div>;
  }
}

export default withInitialData(Page);
```

## Loading and Error States

You can also add `loading` and `error` methods on your component, alongside `render`, that will display when `getInitialData` is either pending or rejects. For example;

```jsx
import React, { Component } from 'react';
import { withInitialData } from 'react-data-fetching-components';

class Page extends Component {
  static async getInitialData(props) {
    const res = await fetch('...');
    const json = await res.json();

    return json;
  }

  loading() {
    return <div>Loading data...</div>;
  }

  error() {
    return <div>Error loading data!</div>;
  }

  render() {
    return <div>{this.props.data}</div>;
  }
}

export default withInitialData(Page);
```

## Server-Side Rendering

### Setup

To get SSR working, you just need to edit two files. First, edit your `server.js` file by awaiting on `getAllInitialData` before rendering your top-level app component. Then, when you're ready to `renderToString`, wrap the app component with `<ComponentDataStore data={data}>` to pass in the data that has been pre-fetched. It should look something like this pseudocode;

```jsx
import {
  ComponentDataStore,
  getAllInitialData
} from 'react-data-fetching-components';

server.get('/*', async (req, res) => {
  const app = <App />;

  const data = await getAllInitialData(app);

  const markup = renderToString(
    <ComponentDataStore data={data}>{app}</ComponentDataStore>
  );

  res.status(200).send(`<html>
    <body>
      ${markup}
    </body>
  </html>`);
});
```

Then, in your HTML response, you should add the following script tag before your JS assets;

```jsx
<script>window._COMPONENT_DATA_ = ${JSON.stringify(data)};</script>
```

Now, edit your `client.js` file by adding the `<ComponentDataStore>` component and passing in the data from `window._COMPONENT_DATA_` like so;

```jsx
import { ComponentDataStore } from 'react-data-fetching-components';

const data = window._COMPONENT_DATA_;

hydrate(
  <ComponentDataStore data={data}>
    <App />
  </ComponentDataStore>,
  document.getElementById('root')
);
```

This allows the client-side app to seamlessly rehydrate the data loaded during your server request.

### Advanced: Parallelising Network Requests

By default, every time you server-render a component that has `getInitialData`, rendering is paused until that method's Promise is completed. This means that `this.props.data` is always available by the time the `render` method is fired. However, if you have a lot of nested components making network requests, your page load times will start to get noticeably slower, as every request is happening sequentially. Fortunately, there's a solution! Here's an example component;

```jsx
class ParallelComponent extends Component {
  static getInitialDataInParallel = true;

  static async getInitialData(props) {
    const res = await fetch('...');
    const json = await res.json();

    return json;
  }

  render() {
    return <div>{this.props.data ? this.props.data : null}</div>;
  }
}
```

By setting the `getInitialDataInParallel` property on your component class to `true`, during the server-render pass the `getInitialData` Promise will be pushed to an array and later fired in parallel with `Promise.all`. The main caveat for your component is that now, in your `render` method, you must include a conditional check for `this.props.data`, as it will not be defined during the initial render pass.

This is ideal for cases where you have a nested component that makes a data request, but does not depend upon the result of a data request higher up the component tree, e.g. it can rely purely on routing params.
