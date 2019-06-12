import React from "react";
import styled from "styled-components";
let { debounce } = require("lodash");

let Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;

  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  background: #aaa;
  z-index: 10;
`;

let RegexView = styled.div`
  background-color: #eee;
  padding: 3px;

  font-family: monospace;
  white-space: pre;
`;

let inactive_callback = () => {};
let String_match_callback = inactive_callback;
String.prototype.match =
  String.prototype.match.original || String.prototype.match;
let String_prototype_match = String.prototype.match;
// eslint-ignore
console.log("String.prototype.match", String.prototype.match);
String.prototype.match = function(regex, ...args) {
  if (String_match_callback !== inactive_callback) {
    String_match_callback(regex);
  }
  return String_prototype_match.call(this, regex, ...args);
};
String.prototype.match.original = String_prototype_match;

let BAR_SYMBOL = Symbol();
export let RegexWidget = () => {
  let temp_regices = React.useRef([]);
  let [regices, set_regices] = React.useState([]);

  let actual_fn = React.useRef(() => {});
  let add_bar = React.useRef(
    debounce(() => {
      actual_fn.current();
    }, 1000)
  );
  React.useEffect(() => {
    actual_fn.current = () => {
      set_regices(regices => {
        if (regices[0] !== BAR_SYMBOL) {
          return [BAR_SYMBOL, ...regices];
        }
      });
    };
  });

  String_match_callback = regex => {
    if (regices.length === 0) {
      temp_regices.current.push(regex);
      return;
    }

    add_bar.current();
    set_regices(regices => {
      return [regex, ...regices.slice(0, 5)];
    });
  };

  console.log("regices", regices);

  React.useEffect(() => {
    if (temp_regices.current.length > 5) {
      temp_regices.current = [
        ...temp_regices.current.reverse().slice(0, 5),
        /... And more ... /
      ];
    }
    set_regices(temp_regices.current);

    return () => {
      String_match_callback = inactive_callback;
      String.prototype.match = String_prototype_match;
    };
  }, []);

  let ref = React.useRef();
  // React.useLayoutEffect(() => {
  //   console.log('ref:', ref);
  //   let size = ref.getB

  // }, []);

  return (
    <>
      <div style={{ height: 100 }} />
      <Container ref={ref}>
        {regices.map((regex, i) =>
          regex === BAR_SYMBOL ? (
            <div
              style={{
                backgroundColor: "black",
                height: 2,
                width: 50,
                margin: 10
              }}
            />
          ) : (
            <RegexView key={i}>{regex.source}</RegexView>
          )
        )}
      </Container>
    </>
  );
};
