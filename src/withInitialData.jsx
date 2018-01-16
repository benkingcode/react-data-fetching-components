import React from 'react';
import PropTypes from 'prop-types';
import hash from 'object-hash';

// This is a Higher Order Component that abstracts duplicated data fetching
// on the server and client.
export default function withInitialData(WrappedComponent) {
  class withInitialData extends React.Component {
    static getInitialData(ctx) {
      // Need to call the wrapped components getInitialData if it exists
      return WrappedComponent.getInitialData
        ? WrappedComponent.getInitialData(ctx)
        : Promise.resolve(null);
    }

    static contextTypes = {
      componentDataStore: PropTypes.any
    };

    constructor(props, context) {
      super(props);

      const {
        history,
        location,
        staticContext,
        ...componentDataStoreKeyProps
      } = props;

      /*
      My rudimentary attempt at generating a unique ID for each component
      with getInitialData based on its name and route params
      */
      this.componentDataStoreId =
        props.dataKey ||
        `${getDisplayName(WrappedComponent)}${
          Object.keys(componentDataStoreKeyProps).length
            ? `_${hash(componentDataStoreKeyProps)}`
            : ''
        }`;

      let componentDataStoreData;
      if (
        context &&
        context.componentDataStore &&
        context.componentDataStore.data &&
        this.componentDataStoreId in context.componentDataStore.data
      ) {
        componentDataStoreData =
          context.componentDataStore.data[this.componentDataStoreId];

        this.state = {
          data: componentDataStoreData,
          treeWalking: context.treeWalking,
          isLoading: false
        };

        if (typeof window !== 'undefined') {
          delete context.componentDataStore.data[this.componentDataStoreId];
        }
      } else {
        this.state = {
          treeWalking: context.treeWalking,
          isLoading: true
        };
      }

      this.ignoreLastFetch = false;
    }

    componentDidMount() {
      if (!this.state.data) {
        this.fetchData();
      }
    }

    componentDidUpdate(prevProps) {
      if (this.props !== prevProps) {
        this.ignoreLastFetch = false;
        this.fetchData();
      }
    }

    componentWillUnmount() {
      this.ignoreLastFetch = true;
    }

    getInitialDataInParallel = WrappedComponent.getInitialDataInParallel;

    fetchData = () => {
      // if this.state.data is null, that means that the we are on the client.
      // To get the data we need, we just call getInitialData again on mount.
      if (!this.ignoreLastFetch) {
        this.setState({ isLoading: true });

        return this.constructor
          .getInitialData(this.props)
          .then(data => {
            this.setState({ data, isLoading: false });
            return data;
          })
          .catch(error => {
            this.setState(state => ({
              error,
              isLoading: false
            }));
            return null;
          });
      }

      return Promise.resolve(null);
    };

    render() {
      //  if we wanted to create an app-wide error component,
      //  we could also do that here using <HTTPStatus />. However, it is
      //  more flexible to leave this up to the Routes themselves.
      //
      // if (rest.error && rest.error.code) {
      //   <HttpStatus statusCode={rest.error.code || 500}>
      //     {/* cool error screen based on status code */}
      //   </HttpStatus>
      // }

      if (this.state.error) {
        const InitWrappedComponent = new WrappedComponent();
        if (
          'error' in InitWrappedComponent &&
          typeof InitWrappedComponent.error === 'function'
        ) {
          return <InitWrappedComponent.error />;
        }

        return null;
      }

      if (this.state.isLoading && !this.state.treeWalking) {
        const InitWrappedComponent = new WrappedComponent();
        if (
          'loading' in InitWrappedComponent &&
          typeof InitWrappedComponent.loading === 'function'
        ) {
          return <InitWrappedComponent.loading />;
        }

        return null;
      }

      return (
        <WrappedComponent
          {...this.props}
          refetch={this.fetchData}
          data={this.state.data}
        />
      );
    }
  }

  withInitialData.displayName = `withInitialData(${getDisplayName(
    WrappedComponent
  )})`;
  return withInitialData;
}

// This make debugging easier. Components will show as withInitialData(MyComponent) in
// react-dev-tools.
function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}
