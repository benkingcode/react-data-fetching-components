import React from 'react';
import PropTypes from 'prop-types';

import reactTreeWalker from 'react-tree-walker';

/* eslint-disable */
const allParams = o =>
  Promise.all(Object.values(o)).then(promises =>
    Object.keys(o).reduce((o2, key, i) => ((o2[key] = promises[i]), o2), {})
  );
/* eslint-enable */

class TreeWalking extends React.Component {
  static childContextTypes = {
    treeWalking: PropTypes.bool.isRequired
  };

  getChildContext() {
    return {
      treeWalking: true
    };
  }

  render() {
    return React.Children.only(this.props.children);
  }
}

export default async function getAllInitialData(app) {
  const dataResolved = {};
  const dataPromises = {};

  function visitor(element, instance, context) {
    if (
      instance &&
      'fetchData' in instance &&
      typeof instance.fetchData === 'function'
    ) {
      if (instance.getInitialDataInParallel) {
        dataPromises[instance.componentDataStoreId] = instance.fetchData();
      } else {
        return instance.fetchData().then(data => {
          dataResolved[instance.componentDataStoreId] = data;
          return true;
        });
      }
    }

    return true;
  }

  await reactTreeWalker(<TreeWalking>{app}</TreeWalking>, visitor);

  const dataPromisesResolved = await allParams(dataPromises);

  return { ...dataResolved, ...dataPromisesResolved };
}
