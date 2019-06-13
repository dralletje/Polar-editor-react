import React from "react";
import ReactDOM from "react-dom";
import dedent from "dedent";

import Bear from "./Bear.js";
import { RegexWidget } from "./RegexWidget.js";

import "./styles.css";

function App() {
  let [content, set_content] = React.useState(dedent`
    # Polar editor
    A basic text editor that I can use in a variation of apps.
    Too many times I need basic editing, but also just plain text.
    I don't want any html, wysiwyg but without losing simple text editing.

    ### Features
    * *Bold*
    * _Underline_
    * /italic/
    * \`Code\`
    * https://google.com links
    * Even cooler [Click here](https://google.com)

    * *Quotes:*
    > Quote
    > something
    > Maybe *for fun*
    ${"\t"}${"\t"}- Michiel Dral

    * *Numbered lists:*
    1. Ordered #1
    2. Ordered #2
    ${"\t"}This should align to "Ordered #2"
    ${"\t"}1. With nesting
    ${"\t"}${"\t"}Normal text for reference
    ${"\t"}2. To one leven
    ${"\t"}${"\t"}1. And more nesting
    ${"\t"}${"\t"}2. Very cool

    * Dashed links (soon to be checkmarks?)
    - Checkbox #1
    - Checkbox #2

    Fin
  `);
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      {/* <RegexWidget /> */}
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
          editable={true}
          multiline
          onChange={set_content}
        />
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
