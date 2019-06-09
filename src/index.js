import React from "react";
import ReactDOM from "react-dom";

import Bear from "./Bear.js";

import "./styles.css";

function App() {
  let [content, set_content] = React.useState("Jo `je` hem");
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
