import React from 'react';
import {createRoot} from 'react-dom/client';
import {Learning} from './learning.jsx';
let root;
export function mountLearning(container,options={}) {unmountLearning();root=createRoot(container);root.render(<Learning {...options}/>);}
export function unmountLearning(){if(root){root.unmount();root=null;}}
