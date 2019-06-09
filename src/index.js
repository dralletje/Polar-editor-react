import React from "react";
import ReactDOM from "react-dom";
import dedent from "dedent";

import Bear from "./Bear.js";

import "./styles.css";

function App() {
  let [content, set_content] = React.useState(dedent`
    # Polar editor

    A basic text editor that I can use in a variantion of apps.
    Too many times I need basic editting, but also just plain text.
    I don't want any html, wysiwyg but without losing simple text editting.
    
    ## Features
    * *Bold*
    * _Underline_
    * /italic/
    * \`Code\`
    * https://google.com links

    ## To be implemented
    *Lists:*
    * Unordered #1
    * Unordered #2
    
    1. Ordered #1
    2. Ordered #2

    - Checkbox #1
    - Checkbox #2
  `);
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <div
        style={{
          margin: 20,
          fontSize: 18,
          padding: 10,
          backgroundColor: "#eee"
        }}
      >
        <Bear
          style={{ minHeight: 50, textAlign: "left" }}
          content={content}
          multiline
          onChange={set_content}
        />
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);