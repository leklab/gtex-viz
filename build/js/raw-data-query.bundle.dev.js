var RawDataQuery = (function (exports) {
'use strict';

var EOL = {};
var EOF = {};
var QUOTE = 34;
var NEWLINE = 10;
var RETURN = 13;

function objectConverter(columns) {
  return new Function("d", "return {" + columns.map(function(name, i) {
    return JSON.stringify(name) + ": d[" + i + "]";
  }).join(",") + "}");
}

function customConverter(columns, f) {
  var object = objectConverter(columns);
  return function(row, i) {
    return f(object(row), i, columns);
  };
}

// Compute unique columns in order of discovery.
function inferColumns(rows) {
  var columnSet = Object.create(null),
      columns = [];

  rows.forEach(function(row) {
    for (var column in row) {
      if (!(column in columnSet)) {
        columns.push(columnSet[column] = column);
      }
    }
  });

  return columns;
}

var dsv$1 = function(delimiter) {
  var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
      DELIMITER = delimiter.charCodeAt(0);

  function parse(text, f) {
    var convert, columns, rows = parseRows(text, function(row, i) {
      if (convert) return convert(row, i - 1);
      columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
    });
    rows.columns = columns || [];
    return rows;
  }

  function parseRows(text, f) {
    var rows = [], // output rows
        N = text.length,
        I = 0, // current character index
        n = 0, // current line number
        t, // current token
        eof = N <= 0, // current token followed by EOF?
        eol = false; // current token followed by EOL?

    // Strip the trailing newline.
    if (text.charCodeAt(N - 1) === NEWLINE) --N;
    if (text.charCodeAt(N - 1) === RETURN) --N;

    function token() {
      if (eof) return EOF;
      if (eol) return eol = false, EOL;

      // Unescape quotes.
      var i, j = I, c;
      if (text.charCodeAt(j) === QUOTE) {
        while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
        if ((i = I) >= N) eof = true;
        else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        return text.slice(j + 1, i - 1).replace(/""/g, "\"");
      }

      // Find next delimiter or newline.
      while (I < N) {
        if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        else if (c !== DELIMITER) continue;
        return text.slice(j, i);
      }

      // Return last token before EOF.
      return eof = true, text.slice(j, N);
    }

    while ((t = token()) !== EOF) {
      var row = [];
      while (t !== EOL && t !== EOF) row.push(t), t = token();
      if (f && (row = f(row, n++)) == null) continue;
      rows.push(row);
    }

    return rows;
  }

  function format(rows, columns) {
    if (columns == null) columns = inferColumns(rows);
    return [columns.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
      return columns.map(function(column) {
        return formatValue(row[column]);
      }).join(delimiter);
    })).join("\n");
  }

  function formatRows(rows) {
    return rows.map(formatRow).join("\n");
  }

  function formatRow(row) {
    return row.map(formatValue).join(delimiter);
  }

  function formatValue(text) {
    return text == null ? ""
        : reFormat.test(text += "") ? "\"" + text.replace(/"/g, "\"\"") + "\""
        : text;
  }

  return {
    parse: parse,
    parseRows: parseRows,
    format: format,
    formatRows: formatRows
  };
};

var csv$1 = dsv$1(",");

var csvParse = csv$1.parse;

var tsv$1 = dsv$1("\t");

var tsvParse = tsv$1.parse;

function responseText(response) {
  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  return response.text();
}

var text = function(input, init) {
  return fetch(input, init).then(responseText);
};

function dsvParse(parse) {
  return function(input, init, row) {
    if (arguments.length === 2 && typeof init === "function") row = init, init = undefined;
    return text(input, init).then(function(response) {
      return parse(response, row);
    });
  };
}

var csv = dsvParse(csvParse);
var tsv = dsvParse(tsvParse);

function responseJson(response) {
  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  return response.json();
}

var json = function(input, init) {
  return fetch(input, init).then(responseJson);
};

var xhtml = "http://www.w3.org/1999/xhtml";

var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

var namespace = function(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
};

function creatorInherit(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml && document.documentElement.namespaceURI === xhtml
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

var creator = function(name) {
  var fullname = namespace(name);
  return (fullname.local
      ? creatorFixed
      : creatorInherit)(fullname);
};

function none() {}

var selector = function(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
};

var selection_select = function(select) {
  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }

  return new Selection(subgroups, this._parents);
};

function empty() {
  return [];
}

var selectorAll = function(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
};

var selection_selectAll = function(select) {
  if (typeof select !== "function") select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }

  return new Selection(subgroups, parents);
};

var matcher = function(selector) {
  return function() {
    return this.matches(selector);
  };
};

if (typeof document !== "undefined") {
  var element = document.documentElement;
  if (!element.matches) {
    var vendorMatches = element.webkitMatchesSelector
        || element.msMatchesSelector
        || element.mozMatchesSelector
        || element.oMatchesSelector;
    matcher = function(selector) {
      return function() {
        return vendorMatches.call(this, selector);
      };
    };
  }
}

var matcher$1 = matcher;

var selection_filter = function(match) {
  if (typeof match !== "function") match = matcher$1(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection(subgroups, this._parents);
};

var sparse = function(update) {
  return new Array(update.length);
};

var selection_enter = function() {
  return new Selection(this._enter || this._groups.map(sparse), this._parents);
};

function EnterNode(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

var constant = function(x) {
  return function() {
    return x;
  };
};

var keyPrefix = "$"; // Protect against keys like “__proto__”.

function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = {},
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
      if (keyValue in nodeByKeyValue) {
        exit[i] = node;
      } else {
        nodeByKeyValue[keyValue] = node;
      }
    }
  }

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
  for (i = 0; i < dataLength; ++i) {
    keyValue = keyPrefix + key.call(parent, data[i], i, data);
    if (node = nodeByKeyValue[keyValue]) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue[keyValue] = null;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
      exit[i] = node;
    }
  }
}

var selection_data = function(value, key) {
  if (!value) {
    data = new Array(this.size()), j = -1;
    this.each(function(d) { data[++j] = d; });
    return data;
  }

  var bind = key ? bindKey : bindIndex,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = value.call(parent, parent && parent.__data__, j, parents),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
};

var selection_exit = function() {
  return new Selection(this._exit || this._groups.map(sparse), this._parents);
};

var selection_merge = function(selection$$1) {

  for (var groups0 = this._groups, groups1 = selection$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Selection(merges, this._parents);
};

var selection_order = function() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
};

var selection_sort = function(compare) {
  if (!compare) compare = ascending;

  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }

  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }

  return new Selection(sortgroups, this._parents).order();
};

function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

var selection_call = function() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
};

var selection_nodes = function() {
  var nodes = new Array(this.size()), i = -1;
  this.each(function() { nodes[++i] = this; });
  return nodes;
};

var selection_node = function() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
};

var selection_size = function() {
  var size = 0;
  this.each(function() { ++size; });
  return size;
};

var selection_empty = function() {
  return !this.node();
};

var selection_each = function(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
};

function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}

function attrConstantNS(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}

function attrFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}

function attrFunctionNS(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}

var selection_attr = function(name, value) {
  var fullname = namespace(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)
      : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
};

var defaultView = function(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
};

function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}

function styleFunction(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}

var selection_style = function(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove : typeof value === "function"
            ? styleFunction
            : styleConstant)(name, value, priority == null ? "" : priority))
      : styleValue(this.node(), name);
};

function styleValue(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}

function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}

function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}

function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}

var selection_property = function(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove : typeof value === "function"
          ? propertyFunction
          : propertyConstant)(name, value))
      : this.node()[name];
};

function classArray(string) {
  return string.trim().split(/^|\s+/);
}

function classList(node) {
  return node.classList || new ClassList(node);
}

function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}

ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};

function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}

function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}

function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}

function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}

function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}

var selection_classed = function(name, value) {
  var names = classArray(name + "");

  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction : value
      ? classedTrue
      : classedFalse)(names, value));
};

function textRemove() {
  this.textContent = "";
}

function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}

var selection_text = function(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove : (typeof value === "function"
          ? textFunction
          : textConstant)(value))
      : this.node().textContent;
};

function htmlRemove() {
  this.innerHTML = "";
}

function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}

function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}

var selection_html = function(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove : (typeof value === "function"
          ? htmlFunction
          : htmlConstant)(value))
      : this.node().innerHTML;
};

function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

var selection_raise = function() {
  return this.each(raise);
};

function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

var selection_lower = function() {
  return this.each(lower);
};

var selection_append = function(name) {
  var create = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
};

function constantNull() {
  return null;
}

var selection_insert = function(name, before) {
  var create = typeof name === "function" ? name : creator(name),
      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
};

function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

var selection_remove = function() {
  return this.each(remove);
};

function selection_cloneShallow() {
  return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
}

function selection_cloneDeep() {
  return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
}

var selection_clone = function(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
};

var selection_datum = function(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
};

var filterEvents = {};



if (typeof document !== "undefined") {
  var element$1 = document.documentElement;
  if (!("onmouseenter" in element$1)) {
    filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
  }
}

function filterContextListener(listener, index, group) {
  listener = contextListener(listener, index, group);
  return function(event) {
    var related = event.relatedTarget;
    if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
      listener.call(this, event);
    }
  };
}

function contextListener(listener, index, group) {
  return function(event1) {
    try {
      listener.call(this, this.__data__, index, group);
    } finally {
      
    }
  };
}

function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
  });
}

function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.capture);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}

function onAdd(typename, value, capture) {
  var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
  return function(d, i, group) {
    var on = this.__on, o, listener = wrap(value, i, group);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.capture);
        this.addEventListener(o.type, o.listener = listener, o.capture = capture);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, capture);
    o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

var selection_on = function(typename, value, capture) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }

  on = value ? onAdd : onRemove;
  if (capture == null) capture = false;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
  return this;
};

function dispatchEvent(node, type, params) {
  var window = defaultView(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }

  node.dispatchEvent(event);
}

function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}

function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}

var selection_dispatch = function(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction
      : dispatchConstant)(type, params));
};

var root = [null];

function Selection(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection() {
  return new Selection([[document.documentElement]], root);
}

Selection.prototype = selection.prototype = {
  constructor: Selection,
  select: selection_select,
  selectAll: selection_selectAll,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  merge: selection_merge,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch
};

var select = function(selector) {
  return typeof selector === "string"
      ? new Selection([[document.querySelector(selector)]], [document.documentElement])
      : new Selection([[selector]], root);
};

"use strict";
function getGtexUrls(){
    const host = 'https://gtexportal.org/rest/v1/'; // NOTE: top expressed genes are not yet in production
    return {
        dyneqtl: host + 'association/dyneqtl',

        exonExp: host + 'expression/medianExonExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',

        geneId: host + 'reference/geneId?format=json&release=v7&geneId=',
        geneExp: host + 'expression/geneExpression?datasetId=gtex_v7&gencodeId=',
        geneModel: host + 'reference/collapsedGeneModel?unfiltered=false&release=v7&geneId=',
        geneModelUnfiltered: host + 'reference/collapsedGeneModel?unfiltered=true&release=v7&geneId=',

        isoform: host + 'reference/transcript?release=v7&gencode_id=',
        isoformExp: host + 'expression/isoformExpression?datasetId=gtex_v7&boxplotDetail=median&gencodeId=',

        junctionExp: host + 'expression/medianJunctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',

        medGeneExp: host + 'expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000',

        sample: 'data/gtex.Sample.csv',
        snp: host + 'reference/snp?reference=current&format=json&snpId=',

        tissue:  host + 'dataset/tissueInfo',
        tissueSites: host + 'dataset/tissueSiteDetail?format=json',

        topInTissueFiltered: host + 'expression/topExpressedGenes?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueId=',
        topInTissue: host + 'expression/topExpressedGenes?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueId=',

        variantId: host + 'reference/snp?format=json&reference=current&release=v7&variantId=',

        // local static files
        rnaseqCram: 'data/rnaseq_cram_files_v7_dbGaP_011516.txt',
        wgsCram: 'data/wgs_cram_files_v7_hg38_dbGaP_011516.txt',

    }
}

/**
 * Parse the genes from GTEx web service
 * @param data {Json}
 * @returns {List} of genes
 */


/**
 * Parse the tissues
 * @param data {Json}
 * @returns {List} of tissues
 */
function parseTissues(data){
    const attr = 'tissueInfo';
    if(!data.hasOwnProperty(attr)) throw 'Fatal Error: parseTissues input error.';
    const tissues = data[attr];

    // sanity check
    ['tissueId', 'tissueName', 'colorHex'].forEach((d)=>{
        if (!tissues[0].hasOwnProperty(d)) throw 'Fatal Error: parseTissue attr not found: ' + d;
    });

    return tissues;
}

/**
 * Parse the tissue groups
 * @param data {Json}
 * @param forEqtl {Boolean}
 * @returns {Dictionary} of lists of tissues indexed by the tissue group name
 */


/**
 * parse the exons
 * @param data {Json}
 * @returns {List} of exons
 */


/**
 * parse the junctions
 * @param data
 * @returns {List} of junctions
 * // we do not store junction structure annotations in Mongo
    // so here we use the junction expression web service to retrieve the junction genomic locations
    // assuming that each tissue has the same junctions,
    // to grab all the known junctions of a gene, we only need to look at one tissue
    // here we arbitrarily pick Liver.
 */


/**
 * parse transcript isoforms from the GTEx web service: 'reference/transcript?release=v7&gencode_id='
 * @param data {Json}
 * returns a dictionary of transcript exon object lists indexed by ENST IDs
 */


/**
 * parse transcript isoforms
 * @param data {Json} from GTEx web service 'reference/transcript?release=v7&gencode_id='
 * returns a list of isoform objects
 */


/**
 * parse final (masked) gene model exon expression
 * expression is normalized to reads per kb
 * @param data {JSON} of exon expression web service
 * @param exons {List} of exons with positions
 * @param useLog {boolean} use log2 transformation
 * @param adjust {Number} default 0.01
 * @returns {List} of exon objects
 */


/**
 * Parse junction median read count data
 * @param data {JSON} of the junction expression web service
 * @param useLog {Boolean} perform log transformation
 * @param adjust {Number} for handling 0's when useLog is true
 * @returns {List} of junction objects
 */


/**
 * parse isoform expression
 * @param data
 * @param useLog
 * @param adjust
 * @returns {*}
 */




/**
 * parse median gene expression
 * @param data {Json} with attr medianGeneExpression
 * @param useLog {Boolean} performs log10 transformation
 * @returns {*}
 */


/**
 * parse the gene expression
 * @param gencodeId {String}
 * @param data {Json} with attr: tissueId, geneSymbol
 * @returns {{exp: {}, geneSymbol: string}}
 */
// function parseGeneExpression(gencodeId, data){
//     let lookupTable = {
//         exp: {}, // indexed by tissueId
//         geneSymbol: ''
//     };
//     if(!data.hasOwnProperty(attr)) throw ('parseGeneExpression input error.');
//     data[attr].forEach((d)=>{
//         if (d.gencodeId == gencodeId) {
//             // if the gencode ID matches the query gencodeId,
//             // add the expression data to the lookup table
//             lookupTable.exp[d.tissueId] = d.data;
//             if ('' == lookupTable.geneSymbol) lookupTable.geneSymbol = d.geneSymbol
//         }
//     });
//     return lookupTable
// }

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 */

/**
 * Creates an SVG
 * @param id {String} a DOM element ID that starts with a "#"
 * @param width {Numeric}
 * @param height {Numeric}
 * @param margin {Object} with two attributes: width and height
 * @return {Selection} the d3 selection object of the SVG
 */

/**
 *
 * @param id {String} the parent dom ID
 * @param width {Numeric}
 * @param height {Numeric}
 * @param margin {Object} with attr: left, top
 * @param svgId {String}
 * @returns {*}
 */


/**
 *
 * @param svgObj
 * @param downloadFileName {String}
 * @param tempDownloadDivId {String}
 */

/**
 * A function for parsing the CSS style sheet and including the style properties in the downloadable SVG.
 * @param dom
 * @returns {Element}
 */
function parseCssStyles (dom) {
    var used = "";
    var sheets = document.styleSheets;

    for (var i = 0; i < sheets.length; i++) { // TODO: walk through this block of code

        try {
            if (sheets[i].cssRules == null) continue;
            var rules = sheets[i].cssRules;

            for (var j = 0; j < rules.length; j++) {
                var rule = rules[j];
                if (typeof(rule.style) != "undefined") {
                    var elems;
                    //Some selectors won't work, and most of these don't matter.
                    try {
                        elems = $(dom).find(rule.selectorText);
                    } catch (e) {
                        elems = [];
                    }

                    if (elems.length > 0) {
                        used += rule.selectorText + " { " + rule.style.cssText + " }\n";
                    }
                }
            }
        } catch (e) {
            // In Firefox, if stylesheet originates from a diff domain,
            // trying to access the cssRules will throw a SecurityError.
            // Hence, we must use a try/catch to handle this in Firefox
            if (e.name !== 'SecurityError') throw e;
            continue;
        }
    }

    var s = document.createElement('style');
    s.setAttribute('type', 'text/css');
    s.innerHTML = "<![CDATA[\n" + used + "\n]]>";

    return s;
}

/**
 * Create a toolbar
 * This class uses a lot of jQuery for dom element manipulation
 */

class Toolbar {
    constructor(domId, tooltip=undefined, vertical=false){
        $(`#${domId}`).show(); // if hidden

        // add a new bargroup div to domID with bootstrap button classes
        const btnClasses = vertical?'btn-group-vertical btn-group-sm': 'btn-group btn-group-sm';
        this.bar = $('<div/>').addClass(btnClasses).appendTo(`#${domId}`);
        this.buttons = {};
        this.tooltip = tooltip;
    }

    /**
     * Create a download button for SVG
     * @param id {String} the button dom ID
     * @param svgId {String} the SVG dom ID to grab and download
     * @param outfileName {String} the download file name
     * @param cloneId {String} the cloned SVG dom ID
     * @param icon {String} a fontawesome's icon class name
     */
    createDownloadSvgButton(id, svgId, outfileName, cloneId, icon='fa-download'){
        const $button = this.createButton(id, icon);
        select(`#${id}`)
            .on('click', ()=>{
                this.downloadSvg(svgId, outfileName, cloneId);
            })
            .on('mouseover', ()=>{
                this.tooltip.show("Download");
            })
            .on('mouseout', ()=>{
                this.tooltip.hide();
            });
    }

    createResetButton(id, callback, icon='fa-expand-arrows-alt'){
        const $button = this.createButton(id, icon);
        select(`#${id}`)
            .on('click', callback)
            .on('mouseover', ()=>{
                this.tooltip.show("Reset the scales");
            })
            .on('mouseout', ()=>{
                this.tooltip.hide();
            });
    }

    /**
     * create a button to the toolbar
     * @param id {String} the button's id
     * @param icon {String} a fontawesome icon class
     * Dependencies: Bootstrap, jQuery, Fontawesome
     */
    createButton(id, icon='fa-download'){
        const $button = $('<a/>').attr('id', id)
            .addClass('btn btn-default').appendTo(this.bar);
        $('<i/>').addClass(`fa ${icon}`).appendTo($button);
        this.buttons[id] = $button;
        return $button;
    }

    /**
     * attach a tooltip dom with the toolbar
     * @param tooltip {Tooltip}
     */
    attachTooltip(tooltip){
        this.tooltip = tooltip;
    }

    /**
     * Download SVG obj
     * @param svgId {String} the SVG dom ID
     * @param fileName {String} the output file name
     * @param cloneId {String} the temporary dom ID to copy the SVG to
     * Dependencies: FileSaver
     */
    downloadSvg(svgId, fileName, cloneId){
        // let svgObj = $($($(`${"#" +svgId} svg`))[0]); // complicated jQuery to get to the SVG object
        let svgObj = $($($(`${"#" +svgId}`))[0]);
        let $svgCopy = svgObj.clone()
        .attr("version", "1.1")
        .attr("xmlns", "http://www.w3.org/2000/svg");

        // parse and add all the CSS styling used by the SVG
        let styles = parseCssStyles(svgObj.get());
        $svgCopy.prepend(styles);

        $("#" + cloneId).html('').hide(); // make sure the copyID is invisible
        let svgHtml = $(`#${cloneId}`).append($svgCopy).html();

        let svgBlob = new Blob([svgHtml], {type: "image/svg+xml"});
        saveAs(svgBlob, fileName); // this is a FileSaver function....

        // clear the temp download div
        $(`#${cloneId}`).html('').hide();
    }
}

'use strict';
/*
TODO:
first build a data matrix with the following structure
{
    col: tissues
    row: data types
    data: [ objects with col and row and value ]
}
 */
/**
 * build the data matrix table
 * @param tableId {String}
 * @param datasetId {String}
 * @param urls
 */

function launch(tableId, datasetId='gtex_v7', urls=getGtexUrls()){
    const promises = [
        // TODO: urls for other datasets
        json(urls.tissue),
        tsv(urls.rnaseqCram),
        tsv(urls.wgsCram),
        tsv(urls.sample),
    ];

    Promise.all(promises)
        .then(function(args){
            let tissues = parseTissues(args[0]);
            const cram = {
                rnaseq: args[1].reduce((a, d)=>{a[d.sample_id]=d; return a;}, {}),
                wgs: args[2].reduce((a, d)=>{a[d.sample_id]=d; return a;}, {})
            };
            let samples = args[3]
                .filter((s)=>s.datasetId==datasetId)
                .map((s)=>{
                    switch (s.dataType){
                        case "WGS": {
                            s.cramFile = cram.wgs[s.sampleId];
                            break;
                        }
                        case "RNASEQ": {
                            s.cramFile = cram.rnaseq[s.sampleId];
                            break;
                        }
                        default:
                            // do nothing
                    }

                    return s;
                });
            const theMatrix = _buildMatrix(datasetId, samples, tissues);

            _renderMatrixTable(tableId, theMatrix);
            _addFilters(tableId, theMatrix, samples, tissues);

        })
        .catch(function(err){console.error(err);});
}

function _addFilters(tableId, mat, samples, tissues){
    const __filter = ()=>{
        const sex = select('input[name="sex"]:checked').node().value;
        const age = select('input[name="age"]:checked').node().value;
        if (sex == 'both' && age == 'all'){
            _renderMatrixTable(tableId, _buildMatrix(mat.datasetId, samples, tissues));
        } else {
            let filteredMat = undefined;
            if (sex == 'both') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.ageBracket==age), tissues);
            else if (age == 'all') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex), tissues);
            else filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex && s.ageBracket==age), tissues);
            _renderMatrixTable(tableId, filteredMat);
        }
    };
    select('#filter-menu').selectAll('input[name="sex"]').on('change', __filter);
    select('#filter-menu').selectAll('input[name="age"]').on('change', __filter);
}

function _buildMatrix(datasetId, samples, tissues){
    const __buildHash = function(dataType){
        return samples.filter((s)=>s.dataType==dataType).reduce((a, d)=>{
            if(a[d.tissueId]===undefined) a[d.tissueId] = 0;
            a[d.tissueId]= a[d.tissueId]+1;
            return a;
        }, {});
    };
    const columns = [
        {
            label: 'RNA-Seq',
            id: 'RNASEQ',
            data: __buildHash('RNASEQ')
        },
        {
            label: 'WES',
            id: 'WES',
            data: __buildHash('WES')
        },
        {
            label: 'WGS',
            id: 'WGS',
            data: __buildHash('WGS')
        }
    ];
    const rows = tissues.map((t)=>{
        t.id = t.tissueId;
        t.label = t.tissueName;
        columns.forEach((col)=>{
            t[col.id] = col.data[t.id] || undefined;
        });
        return t;
    });

    return {
        datasetId: datasetId,
        X: rows,
        Y: columns,
        data: samples
    };
}


/**
 * Render the matrix in an HTML table format
 * @param tableId {String} the DOM ID of the table
 * @param mat {Object} of attr: datasetId, X--a list of x objects, Y--a list of y objects
 * @private
 */
function _renderMatrixTable(tableId, mat){
    const dataset = {
        'gtex_v7': {
            label:'GTEX V7',
            bgcolor: '#2a718b'
        }
    };
    // rendering the column labels
    const theTable = select(`#${tableId}`);
    theTable.select('thead').selectAll('th')
        .data([{label:"", id:""}].concat(mat.Y))
        .enter()
        .append('th')
        .attr('scope', 'col')
        .attr('class', (d, i)=>d.id==""?'':`y${i-1}`)
        .text((d)=>d.label);

    theTable.select('.table-label').selectAll('*').remove();
    theTable.select('.table-label').append('th')
        .attr('colspan', mat.Y.length + 1)
        .text(dataset[mat.datasetId].label)
        .style('background-color',dataset[mat.datasetId].bgcolor);

    _renderCounts(theTable.select('tbody'), mat);
    _addClickEvents(tableId);
    _addToolbar(tableId, mat);
}

function _renderCounts(tbody, mat){
    tbody.selectAll('.data-row').remove();
    const theRows = tbody.selectAll('.data-row')
        .data(mat.X)
        .enter()
        .append('tr')
        .classed('data-row', true);

    // rendering the row label
    theRows.append('th')
        .attr('scope', 'row')
        .attr('class', (d, i)=>`x${i}`)
        .text((d)=>d.label);

    mat.Y.forEach((y, j)=>{
        theRows.append('td')
            .attr('class', (d, i)=>{
                return d[y.id]===undefined?'':`x${i} y${j}`;
            })
            .text((d)=>d[y.id]||'');
    });

}

/**
 * Add customized column, row and cell click events
 * @param tableId {String} the dom ID of the table
 * @private
 */
function _addClickEvents(tableId){
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');

    // column labels
    select(`#${tableId}`).select('thead').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selection
           const theColumn = select(this).attr('class');
           if (select(this).attr('scope') == 'col') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theColumn}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'col');
               theCells.filter(`.${theColumn}`).classed('selected', false);
           }
           // console.log(theColumn);
        });

    // row labels
    select(`#${tableId}`).select('tbody').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
           const theRow = select(this).attr('class');
           if (select(this).attr('scope') == 'row') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theRow}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'row');
               theCells.filter(`.${theRow}`).classed('selected', false);
           }
           // console.log(theRow);
        });


    // data cells
    theCells.style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selected class assignment
            select(this).classed('selected', !select(this).classed('selected'));
        });
}

/**
 *
 * @param tableId
 * @param mat
 * @private
 * Reference: https://github.com/eligrey/FileSaver.js/
 */
function _addToolbar(tableId, mat){
    // TODO: get rid of hard-coded dom IDs
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');
    select('#matrix-table-toolbar').selectAll('*').remove();
    const toolbar = new Toolbar('matrix-table-toolbar', undefined, true);
    toolbar.createButton('sample-download');
    toolbar.createButton('send-to-firecloud', 'fa-cloud-upload-alt');

    select('#sample-download')
        .style('cursor', 'pointer')
        .on('click', function(){
            let cells = theCells.filter(`.selected`);
            if (cells.empty()) alert('You have not selected any samples to download.');
            else {
                let downloadContent = [
                        'Sample ID',
                        'Tissue Name',
                        'Data Type',
                        'CRAM File GCP',
                        'CRAM File AWS',
                        'CRAM File MD5',
                        'CRAM File Size',
                        'CRAM Index GCP',
                        'CRAM Index AWS'
                    ].join("\t") + '\n';
                cells.each(function(d){
                    const marker = select(this).attr('class').split(' ').filter((c)=>{return c!='selected'});
                    const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                    const y = mat.Y[parseInt(marker[1].replace('y', ''))].id;
                    console.log('Download ' + x + ' : '+ y);

                    const selectedSamples = mat.data.filter((s)=>s.dataType==y&&s.tissueId==x&&s.dataType!='WES')
                        /**** WARNING: no WES cram files available ATM ****/
                        .map((s)=>{
                            console.log(s);
                            let cram = [
                                'cram_file',
                                'cram_file_aws',
                                'cram_file_md5',
                                'cram_file_size',
                                'cram_index',
                                'cram_index_aws'
                            ].map((d)=>s.cramFile[d]);
                            let columns = [s.sampleId, s.tissueName, s.dataType].concat(cram);
                            return columns.join("\t");
                        });
                    console.log(selectedSamples);
                    downloadContent += selectedSamples.join("\n");
                });
                let file = new Blob([downloadContent], {type: 'text/plain;charset=utf-8'});
                saveAs(file, 'GTEx.cram.txt', true); // saveAs() is a FileSaver file, disable auto BOM

            }

        });

    select('#send-to-firecloud')
        .style('cursor', 'pointer')
        .on('click', function(){
             let cells = theCells.filter(`.selected`);
             if (cells.empty()) alert('You have not selected any samples to download.');
             else {
                 cells.each(function(d) {
                     const marker = select(this).attr('class').split(' ').filter((c) => {
                         return c != 'selected'
                     });
                     const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                     const y = mat.Y[parseInt(marker[1].replace('y', ''))].id;
                     console.log('Download ' + x + ' : ' + y);
                 });
                 select('#fire-cloud-form').style("display", "block");
             }
        });

    select('#submit-to-firecloud-btn')
        .on('click', function(){
            select('#fire-cloud-form').style("display", "none");
            alert('Submitted!');
        });
}

exports.launch = launch;

return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3LWRhdGEtcXVlcnkuYnVuZGxlLmRldi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvZHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvY3N2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvdHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy90ZXh0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy9kc3YuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZmV0Y2gvc3JjL2pzb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9uYW1lc3BhY2VzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbmFtZXNwYWNlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvY3JlYXRvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yQWxsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdEFsbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL21hdGNoZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZmlsdGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NwYXJzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lbnRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL2NvbnN0YW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2RhdGEuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZXhpdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9tZXJnZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vcmRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zb3J0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2NhbGwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zaXplLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VtcHR5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VhY2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vYXR0ci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3dpbmRvdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zdHlsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9wcm9wZXJ0eS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbGFzc2VkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3RleHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaHRtbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yYWlzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9sb3dlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9hcHBlbmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5zZXJ0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3JlbW92ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbG9uZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kYXR1bS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kaXNwYXRjaC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdC5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMvZ3RleERhdGFQYXJzZXIuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL3V0aWxzLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9Ub29sYmFyLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvUmF3RGF0YVF1ZXJ5LmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBFT0wgPSB7fSxcbiAgICBFT0YgPSB7fSxcbiAgICBRVU9URSA9IDM0LFxuICAgIE5FV0xJTkUgPSAxMCxcbiAgICBSRVRVUk4gPSAxMztcblxuZnVuY3Rpb24gb2JqZWN0Q29udmVydGVyKGNvbHVtbnMpIHtcbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImRcIiwgXCJyZXR1cm4ge1wiICsgY29sdW1ucy5tYXAoZnVuY3Rpb24obmFtZSwgaSkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShuYW1lKSArIFwiOiBkW1wiICsgaSArIFwiXVwiO1xuICB9KS5qb2luKFwiLFwiKSArIFwifVwiKTtcbn1cblxuZnVuY3Rpb24gY3VzdG9tQ29udmVydGVyKGNvbHVtbnMsIGYpIHtcbiAgdmFyIG9iamVjdCA9IG9iamVjdENvbnZlcnRlcihjb2x1bW5zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHJvdywgaSkge1xuICAgIHJldHVybiBmKG9iamVjdChyb3cpLCBpLCBjb2x1bW5zKTtcbiAgfTtcbn1cblxuLy8gQ29tcHV0ZSB1bmlxdWUgY29sdW1ucyBpbiBvcmRlciBvZiBkaXNjb3ZlcnkuXG5mdW5jdGlvbiBpbmZlckNvbHVtbnMocm93cykge1xuICB2YXIgY29sdW1uU2V0ID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIGNvbHVtbnMgPSBbXTtcblxuICByb3dzLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgZm9yICh2YXIgY29sdW1uIGluIHJvdykge1xuICAgICAgaWYgKCEoY29sdW1uIGluIGNvbHVtblNldCkpIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKGNvbHVtblNldFtjb2x1bW5dID0gY29sdW1uKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjb2x1bW5zO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkZWxpbWl0ZXIpIHtcbiAgdmFyIHJlRm9ybWF0ID0gbmV3IFJlZ0V4cChcIltcXFwiXCIgKyBkZWxpbWl0ZXIgKyBcIlxcblxccl1cIiksXG4gICAgICBERUxJTUlURVIgPSBkZWxpbWl0ZXIuY2hhckNvZGVBdCgwKTtcblxuICBmdW5jdGlvbiBwYXJzZSh0ZXh0LCBmKSB7XG4gICAgdmFyIGNvbnZlcnQsIGNvbHVtbnMsIHJvd3MgPSBwYXJzZVJvd3ModGV4dCwgZnVuY3Rpb24ocm93LCBpKSB7XG4gICAgICBpZiAoY29udmVydCkgcmV0dXJuIGNvbnZlcnQocm93LCBpIC0gMSk7XG4gICAgICBjb2x1bW5zID0gcm93LCBjb252ZXJ0ID0gZiA/IGN1c3RvbUNvbnZlcnRlcihyb3csIGYpIDogb2JqZWN0Q29udmVydGVyKHJvdyk7XG4gICAgfSk7XG4gICAgcm93cy5jb2x1bW5zID0gY29sdW1ucyB8fCBbXTtcbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlUm93cyh0ZXh0LCBmKSB7XG4gICAgdmFyIHJvd3MgPSBbXSwgLy8gb3V0cHV0IHJvd3NcbiAgICAgICAgTiA9IHRleHQubGVuZ3RoLFxuICAgICAgICBJID0gMCwgLy8gY3VycmVudCBjaGFyYWN0ZXIgaW5kZXhcbiAgICAgICAgbiA9IDAsIC8vIGN1cnJlbnQgbGluZSBudW1iZXJcbiAgICAgICAgdCwgLy8gY3VycmVudCB0b2tlblxuICAgICAgICBlb2YgPSBOIDw9IDAsIC8vIGN1cnJlbnQgdG9rZW4gZm9sbG93ZWQgYnkgRU9GP1xuICAgICAgICBlb2wgPSBmYWxzZTsgLy8gY3VycmVudCB0b2tlbiBmb2xsb3dlZCBieSBFT0w/XG5cbiAgICAvLyBTdHJpcCB0aGUgdHJhaWxpbmcgbmV3bGluZS5cbiAgICBpZiAodGV4dC5jaGFyQ29kZUF0KE4gLSAxKSA9PT0gTkVXTElORSkgLS1OO1xuICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoTiAtIDEpID09PSBSRVRVUk4pIC0tTjtcblxuICAgIGZ1bmN0aW9uIHRva2VuKCkge1xuICAgICAgaWYgKGVvZikgcmV0dXJuIEVPRjtcbiAgICAgIGlmIChlb2wpIHJldHVybiBlb2wgPSBmYWxzZSwgRU9MO1xuXG4gICAgICAvLyBVbmVzY2FwZSBxdW90ZXMuXG4gICAgICB2YXIgaSwgaiA9IEksIGM7XG4gICAgICBpZiAodGV4dC5jaGFyQ29kZUF0KGopID09PSBRVU9URSkge1xuICAgICAgICB3aGlsZSAoSSsrIDwgTiAmJiB0ZXh0LmNoYXJDb2RlQXQoSSkgIT09IFFVT1RFIHx8IHRleHQuY2hhckNvZGVBdCgrK0kpID09PSBRVU9URSk7XG4gICAgICAgIGlmICgoaSA9IEkpID49IE4pIGVvZiA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKChjID0gdGV4dC5jaGFyQ29kZUF0KEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGogKyAxLCBpIC0gMSkucmVwbGFjZSgvXCJcIi9nLCBcIlxcXCJcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbmQgbmV4dCBkZWxpbWl0ZXIgb3IgbmV3bGluZS5cbiAgICAgIHdoaWxlIChJIDwgTikge1xuICAgICAgICBpZiAoKGMgPSB0ZXh0LmNoYXJDb2RlQXQoaSA9IEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIGVsc2UgaWYgKGMgIT09IERFTElNSVRFUikgY29udGludWU7XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGosIGkpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXR1cm4gbGFzdCB0b2tlbiBiZWZvcmUgRU9GLlxuICAgICAgcmV0dXJuIGVvZiA9IHRydWUsIHRleHQuc2xpY2UoaiwgTik7XG4gICAgfVxuXG4gICAgd2hpbGUgKCh0ID0gdG9rZW4oKSkgIT09IEVPRikge1xuICAgICAgdmFyIHJvdyA9IFtdO1xuICAgICAgd2hpbGUgKHQgIT09IEVPTCAmJiB0ICE9PSBFT0YpIHJvdy5wdXNoKHQpLCB0ID0gdG9rZW4oKTtcbiAgICAgIGlmIChmICYmIChyb3cgPSBmKHJvdywgbisrKSkgPT0gbnVsbCkgY29udGludWU7XG4gICAgICByb3dzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdChyb3dzLCBjb2x1bW5zKSB7XG4gICAgaWYgKGNvbHVtbnMgPT0gbnVsbCkgY29sdW1ucyA9IGluZmVyQ29sdW1ucyhyb3dzKTtcbiAgICByZXR1cm4gW2NvbHVtbnMubWFwKGZvcm1hdFZhbHVlKS5qb2luKGRlbGltaXRlcildLmNvbmNhdChyb3dzLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJldHVybiBjb2x1bW5zLm1hcChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdFZhbHVlKHJvd1tjb2x1bW5dKTtcbiAgICAgIH0pLmpvaW4oZGVsaW1pdGVyKTtcbiAgICB9KSkuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFJvd3Mocm93cykge1xuICAgIHJldHVybiByb3dzLm1hcChmb3JtYXRSb3cpLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRSb3cocm93KSB7XG4gICAgcmV0dXJuIHJvdy5tYXAoZm9ybWF0VmFsdWUpLmpvaW4oZGVsaW1pdGVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFZhbHVlKHRleHQpIHtcbiAgICByZXR1cm4gdGV4dCA9PSBudWxsID8gXCJcIlxuICAgICAgICA6IHJlRm9ybWF0LnRlc3QodGV4dCArPSBcIlwiKSA/IFwiXFxcIlwiICsgdGV4dC5yZXBsYWNlKC9cIi9nLCBcIlxcXCJcXFwiXCIpICsgXCJcXFwiXCJcbiAgICAgICAgOiB0ZXh0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwYXJzZTogcGFyc2UsXG4gICAgcGFyc2VSb3dzOiBwYXJzZVJvd3MsXG4gICAgZm9ybWF0OiBmb3JtYXQsXG4gICAgZm9ybWF0Um93czogZm9ybWF0Um93c1xuICB9O1xufVxuIiwiaW1wb3J0IGRzdiBmcm9tIFwiLi9kc3ZcIjtcblxudmFyIGNzdiA9IGRzdihcIixcIik7XG5cbmV4cG9ydCB2YXIgY3N2UGFyc2UgPSBjc3YucGFyc2U7XG5leHBvcnQgdmFyIGNzdlBhcnNlUm93cyA9IGNzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIGNzdkZvcm1hdCA9IGNzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIGNzdkZvcm1hdFJvd3MgPSBjc3YuZm9ybWF0Um93cztcbiIsImltcG9ydCBkc3YgZnJvbSBcIi4vZHN2XCI7XG5cbnZhciB0c3YgPSBkc3YoXCJcXHRcIik7XG5cbmV4cG9ydCB2YXIgdHN2UGFyc2UgPSB0c3YucGFyc2U7XG5leHBvcnQgdmFyIHRzdlBhcnNlUm93cyA9IHRzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIHRzdkZvcm1hdCA9IHRzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIHRzdkZvcm1hdFJvd3MgPSB0c3YuZm9ybWF0Um93cztcbiIsImZ1bmN0aW9uIHJlc3BvbnNlVGV4dChyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlVGV4dCk7XG59XG4iLCJpbXBvcnQge2NzdlBhcnNlLCBkc3ZGb3JtYXQsIHRzdlBhcnNlfSBmcm9tIFwiZDMtZHN2XCI7XG5pbXBvcnQgdGV4dCBmcm9tIFwiLi90ZXh0XCI7XG5cbmZ1bmN0aW9uIGRzdlBhcnNlKHBhcnNlKSB7XG4gIHJldHVybiBmdW5jdGlvbihpbnB1dCwgaW5pdCwgcm93KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgdHlwZW9mIGluaXQgPT09IFwiZnVuY3Rpb25cIikgcm93ID0gaW5pdCwgaW5pdCA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGV4dChpbnB1dCwgaW5pdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHBhcnNlKHJlc3BvbnNlLCByb3cpO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkc3YoZGVsaW1pdGVyLCBpbnB1dCwgaW5pdCwgcm93KSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzICYmIHR5cGVvZiBpbml0ID09PSBcImZ1bmN0aW9uXCIpIHJvdyA9IGluaXQsIGluaXQgPSB1bmRlZmluZWQ7XG4gIHZhciBmb3JtYXQgPSBkc3ZGb3JtYXQoZGVsaW1pdGVyKTtcbiAgcmV0dXJuIHRleHQoaW5wdXQsIGluaXQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICByZXR1cm4gZm9ybWF0LnBhcnNlKHJlc3BvbnNlLCByb3cpO1xuICB9KTtcbn1cblxuZXhwb3J0IHZhciBjc3YgPSBkc3ZQYXJzZShjc3ZQYXJzZSk7XG5leHBvcnQgdmFyIHRzdiA9IGRzdlBhcnNlKHRzdlBhcnNlKTtcbiIsImZ1bmN0aW9uIHJlc3BvbnNlSnNvbihyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlSnNvbik7XG59XG4iLCJleHBvcnQgdmFyIHhodG1sID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc3ZnOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsXG4gIHhodG1sOiB4aHRtbCxcbiAgeGxpbms6IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLFxuICB4bWw6IFwiaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlXCIsXG4gIHhtbG5zOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAveG1sbnMvXCJcbn07XG4iLCJpbXBvcnQgbmFtZXNwYWNlcyBmcm9tIFwiLi9uYW1lc3BhY2VzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHByZWZpeCA9IG5hbWUgKz0gXCJcIiwgaSA9IHByZWZpeC5pbmRleE9mKFwiOlwiKTtcbiAgaWYgKGkgPj0gMCAmJiAocHJlZml4ID0gbmFtZS5zbGljZSgwLCBpKSkgIT09IFwieG1sbnNcIikgbmFtZSA9IG5hbWUuc2xpY2UoaSArIDEpO1xuICByZXR1cm4gbmFtZXNwYWNlcy5oYXNPd25Qcm9wZXJ0eShwcmVmaXgpID8ge3NwYWNlOiBuYW1lc3BhY2VzW3ByZWZpeF0sIGxvY2FsOiBuYW1lfSA6IG5hbWU7XG59XG4iLCJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuL25hbWVzcGFjZVwiO1xuaW1wb3J0IHt4aHRtbH0gZnJvbSBcIi4vbmFtZXNwYWNlc1wiO1xuXG5mdW5jdGlvbiBjcmVhdG9ySW5oZXJpdChuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLm93bmVyRG9jdW1lbnQsXG4gICAgICAgIHVyaSA9IHRoaXMubmFtZXNwYWNlVVJJO1xuICAgIHJldHVybiB1cmkgPT09IHhodG1sICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5uYW1lc3BhY2VVUkkgPT09IHhodG1sXG4gICAgICAgID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKVxuICAgICAgICA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh1cmksIG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdG9yRml4ZWQoZnVsbG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuICByZXR1cm4gKGZ1bGxuYW1lLmxvY2FsXG4gICAgICA/IGNyZWF0b3JGaXhlZFxuICAgICAgOiBjcmVhdG9ySW5oZXJpdCkoZnVsbG5hbWUpO1xufVxuIiwiZnVuY3Rpb24gbm9uZSgpIHt9XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBzZWxlY3RvciA9PSBudWxsID8gbm9uZSA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2VsZWN0b3IgZnJvbSBcIi4uL3NlbGVjdG9yXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvcihzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIHN1Ym5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKHN1Ym5vZGUgPSBzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpKSB7XG4gICAgICAgIGlmIChcIl9fZGF0YV9fXCIgaW4gbm9kZSkgc3Vibm9kZS5fX2RhdGFfXyA9IG5vZGUuX19kYXRhX187XG4gICAgICAgIHN1Ymdyb3VwW2ldID0gc3Vibm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZnVuY3Rpb24gZW1wdHkoKSB7XG4gIHJldHVybiBbXTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHNlbGVjdG9yID09IG51bGwgPyBlbXB0eSA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2VsZWN0b3JBbGwgZnJvbSBcIi4uL3NlbGVjdG9yQWxsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvckFsbChzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IFtdLCBwYXJlbnRzID0gW10sIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHN1Ymdyb3Vwcy5wdXNoKHNlbGVjdC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSk7XG4gICAgICAgIHBhcmVudHMucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHBhcmVudHMpO1xufVxuIiwidmFyIG1hdGNoZXIgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2hlcyhzZWxlY3Rvcik7XG4gIH07XG59O1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBpZiAoIWVsZW1lbnQubWF0Y2hlcykge1xuICAgIHZhciB2ZW5kb3JNYXRjaGVzID0gZWxlbWVudC53ZWJraXRNYXRjaGVzU2VsZWN0b3JcbiAgICAgICAgfHwgZWxlbWVudC5tc01hdGNoZXNTZWxlY3RvclxuICAgICAgICB8fCBlbGVtZW50Lm1vek1hdGNoZXNTZWxlY3RvclxuICAgICAgICB8fCBlbGVtZW50Lm9NYXRjaGVzU2VsZWN0b3I7XG4gICAgbWF0Y2hlciA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB2ZW5kb3JNYXRjaGVzLmNhbGwodGhpcywgc2VsZWN0b3IpO1xuICAgICAgfTtcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1hdGNoZXI7XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCBtYXRjaGVyIGZyb20gXCIuLi9tYXRjaGVyXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG1hdGNoKSB7XG4gIGlmICh0eXBlb2YgbWF0Y2ggIT09IFwiZnVuY3Rpb25cIikgbWF0Y2ggPSBtYXRjaGVyKG1hdGNoKTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHN1Ymdyb3VwID0gc3ViZ3JvdXBzW2pdID0gW10sIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgbWF0Y2guY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpIHtcbiAgICAgICAgc3ViZ3JvdXAucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odXBkYXRlKSB7XG4gIHJldHVybiBuZXcgQXJyYXkodXBkYXRlLmxlbmd0aCk7XG59XG4iLCJpbXBvcnQgc3BhcnNlIGZyb20gXCIuL3NwYXJzZVwiO1xuaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9lbnRlciB8fCB0aGlzLl9ncm91cHMubWFwKHNwYXJzZSksIHRoaXMuX3BhcmVudHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gRW50ZXJOb2RlKHBhcmVudCwgZGF0dW0pIHtcbiAgdGhpcy5vd25lckRvY3VtZW50ID0gcGFyZW50Lm93bmVyRG9jdW1lbnQ7XG4gIHRoaXMubmFtZXNwYWNlVVJJID0gcGFyZW50Lm5hbWVzcGFjZVVSSTtcbiAgdGhpcy5fbmV4dCA9IG51bGw7XG4gIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5fX2RhdGFfXyA9IGRhdHVtO1xufVxuXG5FbnRlck5vZGUucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogRW50ZXJOb2RlLFxuICBhcHBlbmRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5pbnNlcnRCZWZvcmUoY2hpbGQsIHRoaXMuX25leHQpOyB9LFxuICBpbnNlcnRCZWZvcmU6IGZ1bmN0aW9uKGNoaWxkLCBuZXh0KSB7IHJldHVybiB0aGlzLl9wYXJlbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCBuZXh0KTsgfSxcbiAgcXVlcnlTZWxlY3RvcjogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTsgfSxcbiAgcXVlcnlTZWxlY3RvckFsbDogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTsgfVxufTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQge0VudGVyTm9kZX0gZnJvbSBcIi4vZW50ZXJcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi4vY29uc3RhbnRcIjtcblxudmFyIGtleVByZWZpeCA9IFwiJFwiOyAvLyBQcm90ZWN0IGFnYWluc3Qga2V5cyBsaWtlIOKAnF9fcHJvdG9fX+KAnS5cblxuZnVuY3Rpb24gYmluZEluZGV4KHBhcmVudCwgZ3JvdXAsIGVudGVyLCB1cGRhdGUsIGV4aXQsIGRhdGEpIHtcbiAgdmFyIGkgPSAwLFxuICAgICAgbm9kZSxcbiAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuXG4gIC8vIFB1dCBhbnkgbm9uLW51bGwgbm9kZXMgdGhhdCBmaXQgaW50byB1cGRhdGUuXG4gIC8vIFB1dCBhbnkgbnVsbCBub2RlcyBpbnRvIGVudGVyLlxuICAvLyBQdXQgYW55IHJlbWFpbmluZyBkYXRhIGludG8gZW50ZXIuXG4gIGZvciAoOyBpIDwgZGF0YUxlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBQdXQgYW55IG5vbi1udWxsIG5vZGVzIHRoYXQgZG9u4oCZdCBmaXQgaW50byBleGl0LlxuICBmb3IgKDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICBleGl0W2ldID0gbm9kZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYmluZEtleShwYXJlbnQsIGdyb3VwLCBlbnRlciwgdXBkYXRlLCBleGl0LCBkYXRhLCBrZXkpIHtcbiAgdmFyIGksXG4gICAgICBub2RlLFxuICAgICAgbm9kZUJ5S2V5VmFsdWUgPSB7fSxcbiAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoLFxuICAgICAga2V5VmFsdWVzID0gbmV3IEFycmF5KGdyb3VwTGVuZ3RoKSxcbiAgICAgIGtleVZhbHVlO1xuXG4gIC8vIENvbXB1dGUgdGhlIGtleSBmb3IgZWFjaCBub2RlLlxuICAvLyBJZiBtdWx0aXBsZSBub2RlcyBoYXZlIHRoZSBzYW1lIGtleSwgdGhlIGR1cGxpY2F0ZXMgYXJlIGFkZGVkIHRvIGV4aXQuXG4gIGZvciAoaSA9IDA7IGkgPCBncm91cExlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAga2V5VmFsdWVzW2ldID0ga2V5VmFsdWUgPSBrZXlQcmVmaXggKyBrZXkuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCk7XG4gICAgICBpZiAoa2V5VmFsdWUgaW4gbm9kZUJ5S2V5VmFsdWUpIHtcbiAgICAgICAgZXhpdFtpXSA9IG5vZGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENvbXB1dGUgdGhlIGtleSBmb3IgZWFjaCBkYXR1bS5cbiAgLy8gSWYgdGhlcmUgYSBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGtleSwgam9pbiBhbmQgYWRkIGl0IHRvIHVwZGF0ZS5cbiAgLy8gSWYgdGhlcmUgaXMgbm90IChvciB0aGUga2V5IGlzIGEgZHVwbGljYXRlKSwgYWRkIGl0IHRvIGVudGVyLlxuICBmb3IgKGkgPSAwOyBpIDwgZGF0YUxlbmd0aDsgKytpKSB7XG4gICAga2V5VmFsdWUgPSBrZXlQcmVmaXggKyBrZXkuY2FsbChwYXJlbnQsIGRhdGFbaV0sIGksIGRhdGEpO1xuICAgIGlmIChub2RlID0gbm9kZUJ5S2V5VmFsdWVba2V5VmFsdWVdKSB7XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICBub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZV0gPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgYW55IHJlbWFpbmluZyBub2RlcyB0aGF0IHdlcmUgbm90IGJvdW5kIHRvIGRhdGEgdG8gZXhpdC5cbiAgZm9yIChpID0gMDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKG5vZGVCeUtleVZhbHVlW2tleVZhbHVlc1tpXV0gPT09IG5vZGUpKSB7XG4gICAgICBleGl0W2ldID0gbm9kZTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgZGF0YSA9IG5ldyBBcnJheSh0aGlzLnNpemUoKSksIGogPSAtMTtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24oZCkgeyBkYXRhWysral0gPSBkOyB9KTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBiaW5kID0ga2V5ID8gYmluZEtleSA6IGJpbmRJbmRleCxcbiAgICAgIHBhcmVudHMgPSB0aGlzLl9wYXJlbnRzLFxuICAgICAgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdmFsdWUgPSBjb25zdGFudCh2YWx1ZSk7XG5cbiAgZm9yICh2YXIgbSA9IGdyb3Vwcy5sZW5ndGgsIHVwZGF0ZSA9IG5ldyBBcnJheShtKSwgZW50ZXIgPSBuZXcgQXJyYXkobSksIGV4aXQgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgdmFyIHBhcmVudCA9IHBhcmVudHNbal0sXG4gICAgICAgIGdyb3VwID0gZ3JvdXBzW2pdLFxuICAgICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgICAgZGF0YSA9IHZhbHVlLmNhbGwocGFyZW50LCBwYXJlbnQgJiYgcGFyZW50Ll9fZGF0YV9fLCBqLCBwYXJlbnRzKSxcbiAgICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoLFxuICAgICAgICBlbnRlckdyb3VwID0gZW50ZXJbal0gPSBuZXcgQXJyYXkoZGF0YUxlbmd0aCksXG4gICAgICAgIHVwZGF0ZUdyb3VwID0gdXBkYXRlW2pdID0gbmV3IEFycmF5KGRhdGFMZW5ndGgpLFxuICAgICAgICBleGl0R3JvdXAgPSBleGl0W2pdID0gbmV3IEFycmF5KGdyb3VwTGVuZ3RoKTtcblxuICAgIGJpbmQocGFyZW50LCBncm91cCwgZW50ZXJHcm91cCwgdXBkYXRlR3JvdXAsIGV4aXRHcm91cCwgZGF0YSwga2V5KTtcblxuICAgIC8vIE5vdyBjb25uZWN0IHRoZSBlbnRlciBub2RlcyB0byB0aGVpciBmb2xsb3dpbmcgdXBkYXRlIG5vZGUsIHN1Y2ggdGhhdFxuICAgIC8vIGFwcGVuZENoaWxkIGNhbiBpbnNlcnQgdGhlIG1hdGVyaWFsaXplZCBlbnRlciBub2RlIGJlZm9yZSB0aGlzIG5vZGUsXG4gICAgLy8gcmF0aGVyIHRoYW4gYXQgdGhlIGVuZCBvZiB0aGUgcGFyZW50IG5vZGUuXG4gICAgZm9yICh2YXIgaTAgPSAwLCBpMSA9IDAsIHByZXZpb3VzLCBuZXh0OyBpMCA8IGRhdGFMZW5ndGg7ICsraTApIHtcbiAgICAgIGlmIChwcmV2aW91cyA9IGVudGVyR3JvdXBbaTBdKSB7XG4gICAgICAgIGlmIChpMCA+PSBpMSkgaTEgPSBpMCArIDE7XG4gICAgICAgIHdoaWxlICghKG5leHQgPSB1cGRhdGVHcm91cFtpMV0pICYmICsraTEgPCBkYXRhTGVuZ3RoKTtcbiAgICAgICAgcHJldmlvdXMuX25leHQgPSBuZXh0IHx8IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlID0gbmV3IFNlbGVjdGlvbih1cGRhdGUsIHBhcmVudHMpO1xuICB1cGRhdGUuX2VudGVyID0gZW50ZXI7XG4gIHVwZGF0ZS5fZXhpdCA9IGV4aXQ7XG4gIHJldHVybiB1cGRhdGU7XG59XG4iLCJpbXBvcnQgc3BhcnNlIGZyb20gXCIuL3NwYXJzZVwiO1xuaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9leGl0IHx8IHRoaXMuX2dyb3Vwcy5tYXAoc3BhcnNlKSwgdGhpcy5fcGFyZW50cyk7XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0aW9uKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzMCA9IHRoaXMuX2dyb3VwcywgZ3JvdXBzMSA9IHNlbGVjdGlvbi5fZ3JvdXBzLCBtMCA9IGdyb3VwczAubGVuZ3RoLCBtMSA9IGdyb3VwczEubGVuZ3RoLCBtID0gTWF0aC5taW4obTAsIG0xKSwgbWVyZ2VzID0gbmV3IEFycmF5KG0wKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cDAgPSBncm91cHMwW2pdLCBncm91cDEgPSBncm91cHMxW2pdLCBuID0gZ3JvdXAwLmxlbmd0aCwgbWVyZ2UgPSBtZXJnZXNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwMFtpXSB8fCBncm91cDFbaV0pIHtcbiAgICAgICAgbWVyZ2VbaV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBqIDwgbTA7ICsraikge1xuICAgIG1lcmdlc1tqXSA9IGdyb3VwczBbal07XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihtZXJnZXMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gLTEsIG0gPSBncm91cHMubGVuZ3RoOyArK2ogPCBtOykge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gZ3JvdXAubGVuZ3RoIC0gMSwgbmV4dCA9IGdyb3VwW2ldLCBub2RlOyAtLWkgPj0gMDspIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dCAhPT0gbm9kZS5uZXh0U2libGluZykgbmV4dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBuZXh0KTtcbiAgICAgICAgbmV4dCA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29tcGFyZSkge1xuICBpZiAoIWNvbXBhcmUpIGNvbXBhcmUgPSBhc2NlbmRpbmc7XG5cbiAgZnVuY3Rpb24gY29tcGFyZU5vZGUoYSwgYikge1xuICAgIHJldHVybiBhICYmIGIgPyBjb21wYXJlKGEuX19kYXRhX18sIGIuX19kYXRhX18pIDogIWEgLSAhYjtcbiAgfVxuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHNvcnRncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHNvcnRncm91cCA9IHNvcnRncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHNvcnRncm91cFtpXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRncm91cC5zb3J0KGNvbXBhcmVOb2RlKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHNvcnRncm91cHMsIHRoaXMuX3BhcmVudHMpLm9yZGVyKCk7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogYSA+PSBiID8gMCA6IE5hTjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gIGFyZ3VtZW50c1swXSA9IHRoaXM7XG4gIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gIHJldHVybiB0aGlzO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlcyA9IG5ldyBBcnJheSh0aGlzLnNpemUoKSksIGkgPSAtMTtcbiAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkgeyBub2Rlc1srK2ldID0gdGhpczsgfSk7XG4gIHJldHVybiBub2Rlcztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IDAsIG0gPSBncm91cHMubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIGkgPSAwLCBuID0gZ3JvdXAubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICB2YXIgbm9kZSA9IGdyb3VwW2ldO1xuICAgICAgaWYgKG5vZGUpIHJldHVybiBub2RlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBzaXplID0gMDtcbiAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkgeyArK3NpemU7IH0pO1xuICByZXR1cm4gc2l6ZTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMubm9kZSgpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIGogPSAwLCBtID0gZ3JvdXBzLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aCwgbm9kZTsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkgY2FsbGJhY2suY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG4iLCJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuLi9uYW1lc3BhY2VcIjtcblxuZnVuY3Rpb24gYXR0clJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0clJlbW92ZU5TKGZ1bGxuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJDb25zdGFudChuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnROUyhmdWxsbmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2YWx1ZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIGVsc2UgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbk5TKGZ1bGxuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgICBlbHNlIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBub2RlID0gdGhpcy5ub2RlKCk7XG4gICAgcmV0dXJuIGZ1bGxuYW1lLmxvY2FsXG4gICAgICAgID8gbm9kZS5nZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpXG4gICAgICAgIDogbm9kZS5nZXRBdHRyaWJ1dGUoZnVsbG5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyUmVtb3ZlTlMgOiBhdHRyUmVtb3ZlKSA6ICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyRnVuY3Rpb25OUyA6IGF0dHJGdW5jdGlvbilcbiAgICAgIDogKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckNvbnN0YW50TlMgOiBhdHRyQ29uc3RhbnQpKSkoZnVsbG5hbWUsIHZhbHVlKSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihub2RlKSB7XG4gIHJldHVybiAobm9kZS5vd25lckRvY3VtZW50ICYmIG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldykgLy8gbm9kZSBpcyBhIE5vZGVcbiAgICAgIHx8IChub2RlLmRvY3VtZW50ICYmIG5vZGUpIC8vIG5vZGUgaXMgYSBXaW5kb3dcbiAgICAgIHx8IG5vZGUuZGVmYXVsdFZpZXc7IC8vIG5vZGUgaXMgYSBEb2N1bWVudFxufVxuIiwiaW1wb3J0IGRlZmF1bHRWaWV3IGZyb20gXCIuLi93aW5kb3dcIjtcblxuZnVuY3Rpb24gc3R5bGVSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVDb25zdGFudChuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUsIHByaW9yaXR5KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVGdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSB0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuICAgIGVsc2UgdGhpcy5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCB2LCBwcmlvcml0eSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgID8gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgICA/IHN0eWxlUmVtb3ZlIDogdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICAgID8gc3R5bGVGdW5jdGlvblxuICAgICAgICAgICAgOiBzdHlsZUNvbnN0YW50KShuYW1lLCB2YWx1ZSwgcHJpb3JpdHkgPT0gbnVsbCA/IFwiXCIgOiBwcmlvcml0eSkpXG4gICAgICA6IHN0eWxlVmFsdWUodGhpcy5ub2RlKCksIG5hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3R5bGVWYWx1ZShub2RlLCBuYW1lKSB7XG4gIHJldHVybiBub2RlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUobmFtZSlcbiAgICAgIHx8IGRlZmF1bHRWaWV3KG5vZGUpLmdldENvbXB1dGVkU3R5bGUobm9kZSwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKTtcbn1cbiIsImZ1bmN0aW9uIHByb3BlcnR5UmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGRlbGV0ZSB0aGlzW25hbWVdO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eUNvbnN0YW50KG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzW25hbWVdID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5RnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSBkZWxldGUgdGhpc1tuYW1lXTtcbiAgICBlbHNlIHRoaXNbbmFtZV0gPSB2O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgID8gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBwcm9wZXJ0eVJlbW92ZSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBwcm9wZXJ0eUZ1bmN0aW9uXG4gICAgICAgICAgOiBwcm9wZXJ0eUNvbnN0YW50KShuYW1lLCB2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpW25hbWVdO1xufVxuIiwiZnVuY3Rpb24gY2xhc3NBcnJheShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy50cmltKCkuc3BsaXQoL158XFxzKy8pO1xufVxuXG5mdW5jdGlvbiBjbGFzc0xpc3Qobm9kZSkge1xuICByZXR1cm4gbm9kZS5jbGFzc0xpc3QgfHwgbmV3IENsYXNzTGlzdChub2RlKTtcbn1cblxuZnVuY3Rpb24gQ2xhc3NMaXN0KG5vZGUpIHtcbiAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gIHRoaXMuX25hbWVzID0gY2xhc3NBcnJheShub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpIHx8IFwiXCIpO1xufVxuXG5DbGFzc0xpc3QucHJvdG90eXBlID0ge1xuICBhZGQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPCAwKSB7XG4gICAgICB0aGlzLl9uYW1lcy5wdXNoKG5hbWUpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPj0gMCkge1xuICAgICAgdGhpcy5fbmFtZXMuc3BsaWNlKGksIDEpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICBjb250YWluczogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpID49IDA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNsYXNzZWRBZGQobm9kZSwgbmFtZXMpIHtcbiAgdmFyIGxpc3QgPSBjbGFzc0xpc3Qobm9kZSksIGkgPSAtMSwgbiA9IG5hbWVzLmxlbmd0aDtcbiAgd2hpbGUgKCsraSA8IG4pIGxpc3QuYWRkKG5hbWVzW2ldKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZFJlbW92ZShub2RlLCBuYW1lcykge1xuICB2YXIgbGlzdCA9IGNsYXNzTGlzdChub2RlKSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICB3aGlsZSAoKytpIDwgbikgbGlzdC5yZW1vdmUobmFtZXNbaV0pO1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkVHJ1ZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZEFkZCh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGYWxzZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZFJlbW92ZSh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGdW5jdGlvbihuYW1lcywgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICh2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpID8gY2xhc3NlZEFkZCA6IGNsYXNzZWRSZW1vdmUpKHRoaXMsIG5hbWVzKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIG5hbWVzID0gY2xhc3NBcnJheShuYW1lICsgXCJcIik7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIGxpc3QgPSBjbGFzc0xpc3QodGhpcy5ub2RlKCkpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IG4pIGlmICghbGlzdC5jb250YWlucyhuYW1lc1tpXSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVhY2goKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IGNsYXNzZWRGdW5jdGlvbiA6IHZhbHVlXG4gICAgICA/IGNsYXNzZWRUcnVlXG4gICAgICA6IGNsYXNzZWRGYWxzZSkobmFtZXMsIHZhbHVlKSk7XG59XG4iLCJmdW5jdGlvbiB0ZXh0UmVtb3ZlKCkge1xuICB0aGlzLnRleHRDb250ZW50ID0gXCJcIjtcbn1cblxuZnVuY3Rpb24gdGV4dENvbnN0YW50KHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRleHRGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB2ID09IG51bGwgPyBcIlwiIDogdjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5lYWNoKHZhbHVlID09IG51bGxcbiAgICAgICAgICA/IHRleHRSZW1vdmUgOiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IHRleHRGdW5jdGlvblxuICAgICAgICAgIDogdGV4dENvbnN0YW50KSh2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpLnRleHRDb250ZW50O1xufVxuIiwiZnVuY3Rpb24gaHRtbFJlbW92ZSgpIHtcbiAgdGhpcy5pbm5lckhUTUwgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBodG1sQ29uc3RhbnQodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGh0bWxGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBodG1sUmVtb3ZlIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBodG1sRnVuY3Rpb25cbiAgICAgICAgICA6IGh0bWxDb25zdGFudCkodmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKS5pbm5lckhUTUw7XG59XG4iLCJmdW5jdGlvbiByYWlzZSgpIHtcbiAgaWYgKHRoaXMubmV4dFNpYmxpbmcpIHRoaXMucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2gocmFpc2UpO1xufVxuIiwiZnVuY3Rpb24gbG93ZXIoKSB7XG4gIGlmICh0aGlzLnByZXZpb3VzU2libGluZykgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLCB0aGlzLnBhcmVudE5vZGUuZmlyc3RDaGlsZCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKGxvd2VyKTtcbn1cbiIsImltcG9ydCBjcmVhdG9yIGZyb20gXCIuLi9jcmVhdG9yXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmFwcGVuZENoaWxkKGNyZWF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfSk7XG59XG4iLCJpbXBvcnQgY3JlYXRvciBmcm9tIFwiLi4vY3JlYXRvclwiO1xuaW1wb3J0IHNlbGVjdG9yIGZyb20gXCIuLi9zZWxlY3RvclwiO1xuXG5mdW5jdGlvbiBjb25zdGFudE51bGwoKSB7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCBiZWZvcmUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKSxcbiAgICAgIHNlbGVjdCA9IGJlZm9yZSA9PSBudWxsID8gY29uc3RhbnROdWxsIDogdHlwZW9mIGJlZm9yZSA9PT0gXCJmdW5jdGlvblwiID8gYmVmb3JlIDogc2VsZWN0b3IoYmVmb3JlKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmluc2VydEJlZm9yZShjcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSwgc2VsZWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgbnVsbCk7XG4gIH0pO1xufVxuIiwiZnVuY3Rpb24gcmVtb3ZlKCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICBpZiAocGFyZW50KSBwYXJlbnQucmVtb3ZlQ2hpbGQodGhpcyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKHJlbW92ZSk7XG59XG4iLCJmdW5jdGlvbiBzZWxlY3Rpb25fY2xvbmVTaGFsbG93KCkge1xuICByZXR1cm4gdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNsb25lTm9kZShmYWxzZSksIHRoaXMubmV4dFNpYmxpbmcpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3Rpb25fY2xvbmVEZWVwKCkge1xuICByZXR1cm4gdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNsb25lTm9kZSh0cnVlKSwgdGhpcy5uZXh0U2libGluZyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGRlZXApIHtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGRlZXAgPyBzZWxlY3Rpb25fY2xvbmVEZWVwIDogc2VsZWN0aW9uX2Nsb25lU2hhbGxvdyk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLnByb3BlcnR5KFwiX19kYXRhX19cIiwgdmFsdWUpXG4gICAgICA6IHRoaXMubm9kZSgpLl9fZGF0YV9fO1xufVxuIiwidmFyIGZpbHRlckV2ZW50cyA9IHt9O1xuXG5leHBvcnQgdmFyIGV2ZW50ID0gbnVsbDtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgaWYgKCEoXCJvbm1vdXNlZW50ZXJcIiBpbiBlbGVtZW50KSkge1xuICAgIGZpbHRlckV2ZW50cyA9IHttb3VzZWVudGVyOiBcIm1vdXNlb3ZlclwiLCBtb3VzZWxlYXZlOiBcIm1vdXNlb3V0XCJ9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbHRlckNvbnRleHRMaXN0ZW5lcihsaXN0ZW5lciwgaW5kZXgsIGdyb3VwKSB7XG4gIGxpc3RlbmVyID0gY29udGV4dExpc3RlbmVyKGxpc3RlbmVyLCBpbmRleCwgZ3JvdXApO1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgcmVsYXRlZCA9IGV2ZW50LnJlbGF0ZWRUYXJnZXQ7XG4gICAgaWYgKCFyZWxhdGVkIHx8IChyZWxhdGVkICE9PSB0aGlzICYmICEocmVsYXRlZC5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbih0aGlzKSAmIDgpKSkge1xuICAgICAgbGlzdGVuZXIuY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBjb250ZXh0TGlzdGVuZXIobGlzdGVuZXIsIGluZGV4LCBncm91cCkge1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQxKSB7XG4gICAgdmFyIGV2ZW50MCA9IGV2ZW50OyAvLyBFdmVudHMgY2FuIGJlIHJlZW50cmFudCAoZS5nLiwgZm9jdXMpLlxuICAgIGV2ZW50ID0gZXZlbnQxO1xuICAgIHRyeSB7XG4gICAgICBsaXN0ZW5lci5jYWxsKHRoaXMsIHRoaXMuX19kYXRhX18sIGluZGV4LCBncm91cCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGV2ZW50ID0gZXZlbnQwO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VUeXBlbmFtZXModHlwZW5hbWVzKSB7XG4gIHJldHVybiB0eXBlbmFtZXMudHJpbSgpLnNwbGl0KC9efFxccysvKS5tYXAoZnVuY3Rpb24odCkge1xuICAgIHZhciBuYW1lID0gXCJcIiwgaSA9IHQuaW5kZXhPZihcIi5cIik7XG4gICAgaWYgKGkgPj0gMCkgbmFtZSA9IHQuc2xpY2UoaSArIDEpLCB0ID0gdC5zbGljZSgwLCBpKTtcbiAgICByZXR1cm4ge3R5cGU6IHQsIG5hbWU6IG5hbWV9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gb25SZW1vdmUodHlwZW5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBvbiA9IHRoaXMuX19vbjtcbiAgICBpZiAoIW9uKSByZXR1cm47XG4gICAgZm9yICh2YXIgaiA9IDAsIGkgPSAtMSwgbSA9IG9uLmxlbmd0aCwgbzsgaiA8IG07ICsraikge1xuICAgICAgaWYgKG8gPSBvbltqXSwgKCF0eXBlbmFtZS50eXBlIHx8IG8udHlwZSA9PT0gdHlwZW5hbWUudHlwZSkgJiYgby5uYW1lID09PSB0eXBlbmFtZS5uYW1lKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihvLnR5cGUsIG8ubGlzdGVuZXIsIG8uY2FwdHVyZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvblsrK2ldID0gbztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCsraSkgb24ubGVuZ3RoID0gaTtcbiAgICBlbHNlIGRlbGV0ZSB0aGlzLl9fb247XG4gIH07XG59XG5cbmZ1bmN0aW9uIG9uQWRkKHR5cGVuYW1lLCB2YWx1ZSwgY2FwdHVyZSkge1xuICB2YXIgd3JhcCA9IGZpbHRlckV2ZW50cy5oYXNPd25Qcm9wZXJ0eSh0eXBlbmFtZS50eXBlKSA/IGZpbHRlckNvbnRleHRMaXN0ZW5lciA6IGNvbnRleHRMaXN0ZW5lcjtcbiAgcmV0dXJuIGZ1bmN0aW9uKGQsIGksIGdyb3VwKSB7XG4gICAgdmFyIG9uID0gdGhpcy5fX29uLCBvLCBsaXN0ZW5lciA9IHdyYXAodmFsdWUsIGksIGdyb3VwKTtcbiAgICBpZiAob24pIGZvciAodmFyIGogPSAwLCBtID0gb24ubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgICBpZiAoKG8gPSBvbltqXSkudHlwZSA9PT0gdHlwZW5hbWUudHlwZSAmJiBvLm5hbWUgPT09IHR5cGVuYW1lLm5hbWUpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciwgby5jYXB0dXJlKTtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciA9IGxpc3RlbmVyLCBvLmNhcHR1cmUgPSBjYXB0dXJlKTtcbiAgICAgICAgby52YWx1ZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcih0eXBlbmFtZS50eXBlLCBsaXN0ZW5lciwgY2FwdHVyZSk7XG4gICAgbyA9IHt0eXBlOiB0eXBlbmFtZS50eXBlLCBuYW1lOiB0eXBlbmFtZS5uYW1lLCB2YWx1ZTogdmFsdWUsIGxpc3RlbmVyOiBsaXN0ZW5lciwgY2FwdHVyZTogY2FwdHVyZX07XG4gICAgaWYgKCFvbikgdGhpcy5fX29uID0gW29dO1xuICAgIGVsc2Ugb24ucHVzaChvKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odHlwZW5hbWUsIHZhbHVlLCBjYXB0dXJlKSB7XG4gIHZhciB0eXBlbmFtZXMgPSBwYXJzZVR5cGVuYW1lcyh0eXBlbmFtZSArIFwiXCIpLCBpLCBuID0gdHlwZW5hbWVzLmxlbmd0aCwgdDtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgb24gPSB0aGlzLm5vZGUoKS5fX29uO1xuICAgIGlmIChvbikgZm9yICh2YXIgaiA9IDAsIG0gPSBvbi5sZW5ndGgsIG87IGogPCBtOyArK2opIHtcbiAgICAgIGZvciAoaSA9IDAsIG8gPSBvbltqXTsgaSA8IG47ICsraSkge1xuICAgICAgICBpZiAoKHQgPSB0eXBlbmFtZXNbaV0pLnR5cGUgPT09IG8udHlwZSAmJiB0Lm5hbWUgPT09IG8ubmFtZSkge1xuICAgICAgICAgIHJldHVybiBvLnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIG9uID0gdmFsdWUgPyBvbkFkZCA6IG9uUmVtb3ZlO1xuICBpZiAoY2FwdHVyZSA9PSBudWxsKSBjYXB0dXJlID0gZmFsc2U7XG4gIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHRoaXMuZWFjaChvbih0eXBlbmFtZXNbaV0sIHZhbHVlLCBjYXB0dXJlKSk7XG4gIHJldHVybiB0aGlzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3VzdG9tRXZlbnQoZXZlbnQxLCBsaXN0ZW5lciwgdGhhdCwgYXJncykge1xuICB2YXIgZXZlbnQwID0gZXZlbnQ7XG4gIGV2ZW50MS5zb3VyY2VFdmVudCA9IGV2ZW50O1xuICBldmVudCA9IGV2ZW50MTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gbGlzdGVuZXIuYXBwbHkodGhhdCwgYXJncyk7XG4gIH0gZmluYWxseSB7XG4gICAgZXZlbnQgPSBldmVudDA7XG4gIH1cbn1cbiIsImltcG9ydCBkZWZhdWx0VmlldyBmcm9tIFwiLi4vd2luZG93XCI7XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQobm9kZSwgdHlwZSwgcGFyYW1zKSB7XG4gIHZhciB3aW5kb3cgPSBkZWZhdWx0Vmlldyhub2RlKSxcbiAgICAgIGV2ZW50ID0gd2luZG93LkN1c3RvbUV2ZW50O1xuXG4gIGlmICh0eXBlb2YgZXZlbnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGV2ZW50ID0gbmV3IGV2ZW50KHR5cGUsIHBhcmFtcyk7XG4gIH0gZWxzZSB7XG4gICAgZXZlbnQgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudFwiKTtcbiAgICBpZiAocGFyYW1zKSBldmVudC5pbml0RXZlbnQodHlwZSwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlKSwgZXZlbnQuZGV0YWlsID0gcGFyYW1zLmRldGFpbDtcbiAgICBlbHNlIGV2ZW50LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpO1xuICB9XG5cbiAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuZnVuY3Rpb24gZGlzcGF0Y2hDb25zdGFudCh0eXBlLCBwYXJhbXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkaXNwYXRjaEV2ZW50KHRoaXMsIHR5cGUsIHBhcmFtcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRnVuY3Rpb24odHlwZSwgcGFyYW1zKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGlzcGF0Y2hFdmVudCh0aGlzLCB0eXBlLCBwYXJhbXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHR5cGUsIHBhcmFtcykge1xuICByZXR1cm4gdGhpcy5lYWNoKCh0eXBlb2YgcGFyYW1zID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gZGlzcGF0Y2hGdW5jdGlvblxuICAgICAgOiBkaXNwYXRjaENvbnN0YW50KSh0eXBlLCBwYXJhbXMpKTtcbn1cbiIsImltcG9ydCBzZWxlY3Rpb25fc2VsZWN0IGZyb20gXCIuL3NlbGVjdFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zZWxlY3RBbGwgZnJvbSBcIi4vc2VsZWN0QWxsXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2ZpbHRlciBmcm9tIFwiLi9maWx0ZXJcIjtcbmltcG9ydCBzZWxlY3Rpb25fZGF0YSBmcm9tIFwiLi9kYXRhXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VudGVyIGZyb20gXCIuL2VudGVyXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2V4aXQgZnJvbSBcIi4vZXhpdFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9tZXJnZSBmcm9tIFwiLi9tZXJnZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9vcmRlciBmcm9tIFwiLi9vcmRlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zb3J0IGZyb20gXCIuL3NvcnRcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2FsbCBmcm9tIFwiLi9jYWxsXCI7XG5pbXBvcnQgc2VsZWN0aW9uX25vZGVzIGZyb20gXCIuL25vZGVzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX25vZGUgZnJvbSBcIi4vbm9kZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zaXplIGZyb20gXCIuL3NpemVcIjtcbmltcG9ydCBzZWxlY3Rpb25fZW1wdHkgZnJvbSBcIi4vZW1wdHlcIjtcbmltcG9ydCBzZWxlY3Rpb25fZWFjaCBmcm9tIFwiLi9lYWNoXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2F0dHIgZnJvbSBcIi4vYXR0clwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zdHlsZSBmcm9tIFwiLi9zdHlsZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9wcm9wZXJ0eSBmcm9tIFwiLi9wcm9wZXJ0eVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9jbGFzc2VkIGZyb20gXCIuL2NsYXNzZWRcIjtcbmltcG9ydCBzZWxlY3Rpb25fdGV4dCBmcm9tIFwiLi90ZXh0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX2h0bWwgZnJvbSBcIi4vaHRtbFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9yYWlzZSBmcm9tIFwiLi9yYWlzZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9sb3dlciBmcm9tIFwiLi9sb3dlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9hcHBlbmQgZnJvbSBcIi4vYXBwZW5kXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2luc2VydCBmcm9tIFwiLi9pbnNlcnRcIjtcbmltcG9ydCBzZWxlY3Rpb25fcmVtb3ZlIGZyb20gXCIuL3JlbW92ZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9jbG9uZSBmcm9tIFwiLi9jbG9uZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9kYXR1bSBmcm9tIFwiLi9kYXR1bVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9vbiBmcm9tIFwiLi9vblwiO1xuaW1wb3J0IHNlbGVjdGlvbl9kaXNwYXRjaCBmcm9tIFwiLi9kaXNwYXRjaFwiO1xuXG5leHBvcnQgdmFyIHJvb3QgPSBbbnVsbF07XG5cbmV4cG9ydCBmdW5jdGlvbiBTZWxlY3Rpb24oZ3JvdXBzLCBwYXJlbnRzKSB7XG4gIHRoaXMuX2dyb3VwcyA9IGdyb3VwcztcbiAgdGhpcy5fcGFyZW50cyA9IHBhcmVudHM7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oW1tkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRdXSwgcm9vdCk7XG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUgPSBzZWxlY3Rpb24ucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogU2VsZWN0aW9uLFxuICBzZWxlY3Q6IHNlbGVjdGlvbl9zZWxlY3QsXG4gIHNlbGVjdEFsbDogc2VsZWN0aW9uX3NlbGVjdEFsbCxcbiAgZmlsdGVyOiBzZWxlY3Rpb25fZmlsdGVyLFxuICBkYXRhOiBzZWxlY3Rpb25fZGF0YSxcbiAgZW50ZXI6IHNlbGVjdGlvbl9lbnRlcixcbiAgZXhpdDogc2VsZWN0aW9uX2V4aXQsXG4gIG1lcmdlOiBzZWxlY3Rpb25fbWVyZ2UsXG4gIG9yZGVyOiBzZWxlY3Rpb25fb3JkZXIsXG4gIHNvcnQ6IHNlbGVjdGlvbl9zb3J0LFxuICBjYWxsOiBzZWxlY3Rpb25fY2FsbCxcbiAgbm9kZXM6IHNlbGVjdGlvbl9ub2RlcyxcbiAgbm9kZTogc2VsZWN0aW9uX25vZGUsXG4gIHNpemU6IHNlbGVjdGlvbl9zaXplLFxuICBlbXB0eTogc2VsZWN0aW9uX2VtcHR5LFxuICBlYWNoOiBzZWxlY3Rpb25fZWFjaCxcbiAgYXR0cjogc2VsZWN0aW9uX2F0dHIsXG4gIHN0eWxlOiBzZWxlY3Rpb25fc3R5bGUsXG4gIHByb3BlcnR5OiBzZWxlY3Rpb25fcHJvcGVydHksXG4gIGNsYXNzZWQ6IHNlbGVjdGlvbl9jbGFzc2VkLFxuICB0ZXh0OiBzZWxlY3Rpb25fdGV4dCxcbiAgaHRtbDogc2VsZWN0aW9uX2h0bWwsXG4gIHJhaXNlOiBzZWxlY3Rpb25fcmFpc2UsXG4gIGxvd2VyOiBzZWxlY3Rpb25fbG93ZXIsXG4gIGFwcGVuZDogc2VsZWN0aW9uX2FwcGVuZCxcbiAgaW5zZXJ0OiBzZWxlY3Rpb25faW5zZXJ0LFxuICByZW1vdmU6IHNlbGVjdGlvbl9yZW1vdmUsXG4gIGNsb25lOiBzZWxlY3Rpb25fY2xvbmUsXG4gIGRhdHVtOiBzZWxlY3Rpb25fZGF0dW0sXG4gIG9uOiBzZWxlY3Rpb25fb24sXG4gIGRpc3BhdGNoOiBzZWxlY3Rpb25fZGlzcGF0Y2hcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHNlbGVjdGlvbjtcbiIsImltcG9ydCB7U2VsZWN0aW9uLCByb290fSBmcm9tIFwiLi9zZWxlY3Rpb24vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBuZXcgU2VsZWN0aW9uKFtbZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcildXSwgW2RvY3VtZW50LmRvY3VtZW50RWxlbWVudF0pXG4gICAgICA6IG5ldyBTZWxlY3Rpb24oW1tzZWxlY3Rvcl1dLCByb290KTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuZXhwb3J0IGZ1bmN0aW9uIGdldEd0ZXhVcmxzKCl7XG4gICAgY29uc3QgaG9zdCA9ICdodHRwczovL2d0ZXhwb3J0YWwub3JnL3Jlc3QvdjEvJzsgLy8gTk9URTogdG9wIGV4cHJlc3NlZCBnZW5lcyBhcmUgbm90IHlldCBpbiBwcm9kdWN0aW9uXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZHluZXF0bDogaG9zdCArICdhc3NvY2lhdGlvbi9keW5lcXRsJyxcblxuICAgICAgICBleG9uRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vbWVkaWFuRXhvbkV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmaGNsdXN0ZXI9dHJ1ZSZnZW5jb2RlSWQ9JyxcblxuICAgICAgICBnZW5lSWQ6IGhvc3QgKyAncmVmZXJlbmNlL2dlbmVJZD9mb3JtYXQ9anNvbiZyZWxlYXNlPXY3JmdlbmVJZD0nLFxuICAgICAgICBnZW5lRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vZ2VuZUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmZ2VuY29kZUlkPScsXG4gICAgICAgIGdlbmVNb2RlbDogaG9zdCArICdyZWZlcmVuY2UvY29sbGFwc2VkR2VuZU1vZGVsP3VuZmlsdGVyZWQ9ZmFsc2UmcmVsZWFzZT12NyZnZW5lSWQ9JyxcbiAgICAgICAgZ2VuZU1vZGVsVW5maWx0ZXJlZDogaG9zdCArICdyZWZlcmVuY2UvY29sbGFwc2VkR2VuZU1vZGVsP3VuZmlsdGVyZWQ9dHJ1ZSZyZWxlYXNlPXY3JmdlbmVJZD0nLFxuXG4gICAgICAgIGlzb2Zvcm06IGhvc3QgKyAncmVmZXJlbmNlL3RyYW5zY3JpcHQ/cmVsZWFzZT12NyZnZW5jb2RlX2lkPScsXG4gICAgICAgIGlzb2Zvcm1FeHA6IGhvc3QgKyAnZXhwcmVzc2lvbi9pc29mb3JtRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZib3hwbG90RGV0YWlsPW1lZGlhbiZnZW5jb2RlSWQ9JyxcblxuICAgICAgICBqdW5jdGlvbkV4cDogaG9zdCArICdleHByZXNzaW9uL21lZGlhbkp1bmN0aW9uRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJmdlbmNvZGVJZD0nLFxuXG4gICAgICAgIG1lZEdlbmVFeHA6IGhvc3QgKyAnZXhwcmVzc2lvbi9tZWRpYW5HZW5lRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJnBhZ2Vfc2l6ZT0xMDAwMCcsXG5cbiAgICAgICAgc2FtcGxlOiAnZGF0YS9ndGV4LlNhbXBsZS5jc3YnLFxuICAgICAgICBzbnA6IGhvc3QgKyAncmVmZXJlbmNlL3NucD9yZWZlcmVuY2U9Y3VycmVudCZmb3JtYXQ9anNvbiZzbnBJZD0nLFxuXG4gICAgICAgIHRpc3N1ZTogIGhvc3QgKyAnZGF0YXNldC90aXNzdWVJbmZvJyxcbiAgICAgICAgdGlzc3VlU2l0ZXM6IGhvc3QgKyAnZGF0YXNldC90aXNzdWVTaXRlRGV0YWlsP2Zvcm1hdD1qc29uJyxcblxuICAgICAgICB0b3BJblRpc3N1ZUZpbHRlcmVkOiBob3N0ICsgJ2V4cHJlc3Npb24vdG9wRXhwcmVzc2VkR2VuZXM/ZGF0YXNldElkPWd0ZXhfdjcmZmlsdGVyTXRHZW5lPXRydWUmc29ydF9ieT1tZWRpYW4mc29ydERpcmVjdGlvbj1kZXNjJnBhZ2Vfc2l6ZT01MCZ0aXNzdWVJZD0nLFxuICAgICAgICB0b3BJblRpc3N1ZTogaG9zdCArICdleHByZXNzaW9uL3RvcEV4cHJlc3NlZEdlbmVzP2RhdGFzZXRJZD1ndGV4X3Y3JnNvcnRfYnk9bWVkaWFuJnNvcnREaXJlY3Rpb249ZGVzYyZwYWdlX3NpemU9NTAmdGlzc3VlSWQ9JyxcblxuICAgICAgICB2YXJpYW50SWQ6IGhvc3QgKyAncmVmZXJlbmNlL3NucD9mb3JtYXQ9anNvbiZyZWZlcmVuY2U9Y3VycmVudCZyZWxlYXNlPXY3JnZhcmlhbnRJZD0nLFxuXG4gICAgICAgIC8vIGxvY2FsIHN0YXRpYyBmaWxlc1xuICAgICAgICBybmFzZXFDcmFtOiAnZGF0YS9ybmFzZXFfY3JhbV9maWxlc192N19kYkdhUF8wMTE1MTYudHh0JyxcbiAgICAgICAgd2dzQ3JhbTogJ2RhdGEvd2dzX2NyYW1fZmlsZXNfdjdfaGczOF9kYkdhUF8wMTE1MTYudHh0JyxcblxuICAgIH1cbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2VuZXMgZnJvbSBHVEV4IHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBnZW5lc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VHZW5lcyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gJ2dlbmVJZCc7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdHZW5lIHdlYiBzZXJ2aWNlIHBhcnNpbmcgZXJyb3InO1xuICAgIHJldHVybiBkYXRhW2F0dHJdO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSB0aXNzdWVzXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiB0aXNzdWVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRpc3N1ZXMoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9ICd0aXNzdWVJbmZvJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZXMgaW5wdXQgZXJyb3IuJztcbiAgICBjb25zdCB0aXNzdWVzID0gZGF0YVthdHRyXTtcblxuICAgIC8vIHNhbml0eSBjaGVja1xuICAgIFsndGlzc3VlSWQnLCAndGlzc3VlTmFtZScsICdjb2xvckhleCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICghdGlzc3Vlc1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZSBhdHRyIG5vdCBmb3VuZDogJyArIGQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGlzc3Vlcztcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgdGlzc3VlIGdyb3Vwc1xuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiBAcGFyYW0gZm9yRXF0bCB7Qm9vbGVhbn1cbiAqIEByZXR1cm5zIHtEaWN0aW9uYXJ5fSBvZiBsaXN0cyBvZiB0aXNzdWVzIGluZGV4ZWQgYnkgdGhlIHRpc3N1ZSBncm91cCBuYW1lXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRpc3N1ZVNpdGVzKGRhdGEsIGZvckVxdGw9ZmFsc2Upe1xuICAgIC8vIHRoZSBsaXN0IG9mIGludmFsaWRlIGVxdGwgdGlzc3VlcyBkdWUgdG8gc2FtcGxlIHNpemUgPCA3MFxuICAgIC8vIGEgaGFyZC1jb2RlZCBsaXN0IGJlY2F1c2UgdGhlIHNhbXBsZSBzaXplIGlzIG5vdCBlYXN5IHRvIHJldHJpZXZlXG4gICAgY29uc3QgaW52YWxpZFRpc3N1ZXMgPSBbJ0JsYWRkZXInLCAnQ2Vydml4X0VjdG9jZXJ2aXgnLCAnQ2Vydml4X0VuZG9jZXJ2aXgnLCAnRmFsbG9waWFuX1R1YmUnLCAnS2lkbmV5X0NvcnRleCddO1xuXG4gICAgY29uc3QgYXR0ciA9ICd0aXNzdWVTaXRlRGV0YWlsJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZVNpdGVzIGlucHV0IGVycm9yLic7XG4gICAgY29uc3QgdGlzc3VlcyA9IGZvckVxdGw9PWZhbHNlP2RhdGFbYXR0cl06ZGF0YVthdHRyXS5maWx0ZXIoKGQpPT57cmV0dXJuICFpbnZhbGlkVGlzc3Vlcy5pbmNsdWRlcyhkLnRpc3N1ZV9zaXRlX2RldGFpbF9pZCl9KTsgLy8gYW4gYXJyYXkgb2YgdGlzc3VlX3NpdGVfZGV0YWlsIG9iamVjdHNcblxuICAgIC8vIGJ1aWxkIHRoZSB0aXNzdWVHcm91cHMgbG9va3VwIGRpY3Rpb25hcnkgaW5kZXhlZCBieSB0aGUgdGlzc3VlIGdyb3VwIG5hbWUgKGkuZS4gdGhlIHRpc3N1ZSBtYWluIHNpdGUgbmFtZSlcbiAgICBbJ3Rpc3N1ZV9zaXRlJywgJ3Rpc3N1ZV9zaXRlX2RldGFpbF9pZCcsICd0aXNzdWVfc2l0ZV9kZXRhaWwnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIXRpc3N1ZXNbMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93IGBwYXJzZVRpc3N1ZVNpdGVzIGF0dHIgZXJyb3IuICR7ZH0gaXMgbm90IGZvdW5kYDtcbiAgICB9KTtcbiAgICBsZXQgdGlzc3VlR3JvdXBzID0gdGlzc3Vlcy5yZWR1Y2UoKGFyciwgZCk9PntcbiAgICAgICAgbGV0IGdyb3VwTmFtZSA9IGQudGlzc3VlX3NpdGU7XG4gICAgICAgIGxldCBzaXRlID0ge1xuICAgICAgICAgICAgaWQ6IGQudGlzc3VlX3NpdGVfZGV0YWlsX2lkLFxuICAgICAgICAgICAgbmFtZTogZC50aXNzdWVfc2l0ZV9kZXRhaWxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFhcnIuaGFzT3duUHJvcGVydHkoZ3JvdXBOYW1lKSkgYXJyW2dyb3VwTmFtZV0gPSBbXTsgLy8gaW5pdGlhdGUgYW4gYXJyYXlcbiAgICAgICAgYXJyW2dyb3VwTmFtZV0ucHVzaChzaXRlKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LCB7fSk7XG5cbiAgICAvLyBtb2RpZnkgdGhlIHRpc3N1ZSBncm91cHMgdGhhdCBoYXZlIG9ubHkgYSBzaW5nbGUgc2l0ZVxuICAgIC8vIGJ5IHJlcGxhY2luZyB0aGUgZ3JvdXAncyBuYW1lIHdpdGggdGhlIHNpbmdsZSBzaXRlJ3MgbmFtZSAtLSBmb3IgYSBiZXR0ZXIgQWxwaGFiZXRpY2FsIG9yZGVyIG9mIHRoZSB0aXNzdWUgZ3JvdXBzXG5cbiAgICBPYmplY3Qua2V5cyh0aXNzdWVHcm91cHMpLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICh0aXNzdWVHcm91cHNbZF0ubGVuZ3RoID09IDEpeyAvLyBhIHNpbmdsZS1zaXRlIGdyb3VwXG4gICAgICAgICAgICBsZXQgc2l0ZSA9IHRpc3N1ZUdyb3Vwc1tkXVswXTsgLy8gdGhlIHNpbmdsZSBzaXRlXG4gICAgICAgICAgICBkZWxldGUgdGlzc3VlR3JvdXBzW2RdOyAvLyByZW1vdmUgdGhlIG9sZCBncm91cCBpbiB0aGUgZGljdGlvbmFyeVxuICAgICAgICAgICAgdGlzc3VlR3JvdXBzW3NpdGUubmFtZV0gPSBbc2l0ZV07IC8vIGNyZWF0ZSBhIG5ldyBncm91cCB3aXRoIHRoZSBzaXRlJ3MgbmFtZVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGlzc3VlR3JvdXBzO1xuXG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGV4b25zXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBleG9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFeG9ucyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gJ2NvbGxhcHNlZEdlbmVNb2RlbCc7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VFeG9ucyBpbnB1dCBlcnJvci4nICsgZGF0YTtcbiAgICAvLyBzYW5pdHkgY2hlY2tcbiAgICBbJ2ZlYXR1cmVUeXBlJywgJ3N0YXJ0JywgJ2VuZCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICghZGF0YVthdHRyXVswXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZUV4b25zIGF0dHIgbm90IGZvdW5kOiAnICsgZDtcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT5kLmZlYXR1cmVUeXBlID09ICdleG9uJykubWFwKChkKT0+e1xuICAgICAgICBkLmNocm9tU3RhcnQgPSBkLnN0YXJ0O1xuICAgICAgICBkLmNocm9tRW5kID0gZC5lbmQ7XG4gICAgICAgIHJldHVybiBkO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRoZSBqdW5jdGlvbnNcbiAqIEBwYXJhbSBkYXRhXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YganVuY3Rpb25zXG4gKiAvLyB3ZSBkbyBub3Qgc3RvcmUganVuY3Rpb24gc3RydWN0dXJlIGFubm90YXRpb25zIGluIE1vbmdvXG4gICAgLy8gc28gaGVyZSB3ZSB1c2UgdGhlIGp1bmN0aW9uIGV4cHJlc3Npb24gd2ViIHNlcnZpY2UgdG8gcmV0cmlldmUgdGhlIGp1bmN0aW9uIGdlbm9taWMgbG9jYXRpb25zXG4gICAgLy8gYXNzdW1pbmcgdGhhdCBlYWNoIHRpc3N1ZSBoYXMgdGhlIHNhbWUganVuY3Rpb25zLFxuICAgIC8vIHRvIGdyYWIgYWxsIHRoZSBrbm93biBqdW5jdGlvbnMgb2YgYSBnZW5lLCB3ZSBvbmx5IG5lZWQgdG8gbG9vayBhdCBvbmUgdGlzc3VlXG4gICAgLy8gaGVyZSB3ZSBhcmJpdHJhcmlseSBwaWNrIExpdmVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VKdW5jdGlvbnMoZGF0YSl7XG5cbiAgICBjb25zdCBhdHRyID0gJ21lZGlhbkp1bmN0aW9uRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VKdW5jdGlvbnMgaW5wdXQgZXJyb3IuICcgKyBkYXRhO1xuICAgIHJldHVybiBkYXRhW2F0dHJdLmZpbHRlcigoZCk9PmQudGlzc3VlSWQ9PSdMaXZlcicpXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoKGQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3MgPSBkLmp1bmN0aW9uSWQuc3BsaXQoJ18nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb206IHBvc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbVN0YXJ0OiBwb3NbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21FbmQ6IHBvc1syXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqdW5jdGlvbklkOiBkLmp1bmN0aW9uSWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG59XG5cbi8qKlxuICogcGFyc2UgdHJhbnNjcmlwdCBpc29mb3JtcyBmcm9tIHRoZSBHVEV4IHdlYiBzZXJ2aWNlOiAncmVmZXJlbmNlL3RyYW5zY3JpcHQ/cmVsZWFzZT12NyZnZW5jb2RlX2lkPSdcbiAqIEBwYXJhbSBkYXRhIHtKc29ufVxuICogcmV0dXJucyBhIGRpY3Rpb25hcnkgb2YgdHJhbnNjcmlwdCBleG9uIG9iamVjdCBsaXN0cyBpbmRleGVkIGJ5IEVOU1QgSURzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUlzb2Zvcm1FeG9ucyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gJ3RyYW5zY3JpcHQnO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAncGFyc2VJc29mb3JtcyBpbnB1dCBlcnJvciAnICsgZGF0YTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT57cmV0dXJuICdleG9uJyA9PSBkLmZlYXR1cmVUeXBlfSlcbiAgICAgICAgLnJlZHVjZSgoYSwgZCk9PntcbiAgICAgICAgaWYgKGFbZC50cmFuc2NyaXB0SWRdID09PSB1bmRlZmluZWQpIGFbZC50cmFuc2NyaXB0SWRdID0gW107XG4gICAgICAgIGFbZC50cmFuc2NyaXB0SWRdLnB1c2goZCk7XG4gICAgICAgIHJldHVybiBhO1xuICAgIH0sIHt9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0cmFuc2NyaXB0IGlzb2Zvcm1zXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn0gZnJvbSBHVEV4IHdlYiBzZXJ2aWNlICdyZWZlcmVuY2UvdHJhbnNjcmlwdD9yZWxlYXNlPXY3JmdlbmNvZGVfaWQ9J1xuICogcmV0dXJucyBhIGxpc3Qgb2YgaXNvZm9ybSBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUlzb2Zvcm1zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSAndHJhbnNjcmlwdCc7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yJyk7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl0uZmlsdGVyKChkKT0+e3JldHVybiAndHJhbnNjcmlwdCcgPT0gZC5mZWF0dXJlVHlwZX0pLnNvcnQoKGEsIGIpPT57XG4gICAgICAgIGNvbnN0IGwxID0gTWF0aC5hYnMoYS5jaHJvbUVuZCAtIGEuY2hyb21TdGFydCkgKyAxO1xuICAgICAgICBjb25zdCBsMiA9IE1hdGguYWJzKGIuY2hyb21FbmQgLSBiLmNocm9tU3RhcnQpICsgMTtcbiAgICAgICAgcmV0dXJuIC0obDEtbDIpOyAvLyBzb3J0IGJ5IGlzb2Zvcm0gbGVuZ3RoIGluIGRlc2NlbmRpbmcgb3JkZXJcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBmaW5hbCAobWFza2VkKSBnZW5lIG1vZGVsIGV4b24gZXhwcmVzc2lvblxuICogZXhwcmVzc2lvbiBpcyBub3JtYWxpemVkIHRvIHJlYWRzIHBlciBrYlxuICogQHBhcmFtIGRhdGEge0pTT059IG9mIGV4b24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIGV4b25zIHtMaXN0fSBvZiBleG9ucyB3aXRoIHBvc2l0aW9uc1xuICogQHBhcmFtIHVzZUxvZyB7Ym9vbGVhbn0gdXNlIGxvZzIgdHJhbnNmb3JtYXRpb25cbiAqIEBwYXJhbSBhZGp1c3Qge051bWJlcn0gZGVmYXVsdCAwLjAxXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgZXhvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV4b25FeHByZXNzaW9uKGRhdGEsIGV4b25zLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGV4b25EaWN0ID0gZXhvbnMucmVkdWNlKChhLCBkKT0+e2FbZC5leG9uSWRdID0gZDsgcmV0dXJuIGE7fSwge30pO1xuICAgIGNvbnN0IGF0dHIgPSAnbWVkaWFuRXhvbkV4cHJlc3Npb24nO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdygncGFyc2VFeG9uRXhwcmVzc2lvbiBpbnB1dCBlcnJvcicpO1xuXG4gICAgY29uc3QgZXhvbk9iamVjdHMgPSBkYXRhW2F0dHJdO1xuICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgWydkYXRhJywgJ2V4b25JZCcsICd0aXNzdWVJZCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICghZXhvbk9iamVjdHNbMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VFeG9uRXhwcmVzc2lvbiBhdHRyIG5vdCBmb3VuZDogJyArIGQ7XG4gICAgfSk7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZXhvbiBjb3VudHNcbiAgICBleG9uT2JqZWN0cy5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGNvbnN0IGV4b24gPSBleG9uRGljdFtkLmV4b25JZF07IC8vIGZvciByZXRyaWV2aW5nIGV4b24gcG9zaXRpb25zXG4gICAgICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgICAgIFsnZW5kJywgJ3N0YXJ0J10uZm9yRWFjaCgocCk9PntcbiAgICAgICAgICAgIGlmICghZXhvbi5oYXNPd25Qcm9wZXJ0eShwKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZUV4b25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiAnICsgcDtcbiAgICAgICAgfSk7XG4gICAgICAgIGQubCA9IGV4b24uZW5kIC0gZXhvbi5zdGFydCArIDE7XG4gICAgICAgIGQudmFsdWUgPSBOdW1iZXIoZC5kYXRhKS9kLmw7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLmRhdGEpL2QubDtcbiAgICAgICAgaWYgKHVzZUxvZykgZC52YWx1ZSA9IE1hdGgubG9nMihkLnZhbHVlICsgMSk7XG4gICAgICAgIGQueCA9IGQuZXhvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGV4b24uc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBleG9uLmVuZDtcbiAgICAgICAgZC51bml0ID0gZC51bml0ICsgJyBwZXIgYmFzZSc7XG4gICAgfSk7XG4gICAgcmV0dXJuIGV4b25PYmplY3RzLnNvcnQoKGEsYik9PntcbiAgICAgICAgaWYgKGEuY2hyb21TdGFydDxiLmNocm9tU3RhcnQpIHJldHVybiAtMTtcbiAgICAgICAgaWYgKGEuY2hyb21TdGFydD5iLmNocm9tU3RhcnQpIHJldHVybiAxO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTsgLy8gc29ydCBieSBnZW5vbWljIGxvY2F0aW9uIGluIGFzY2VuZGluZyBvcmRlclxufVxuXG4vKipcbiAqIFBhcnNlIGp1bmN0aW9uIG1lZGlhbiByZWFkIGNvdW50IGRhdGFcbiAqIEBwYXJhbSBkYXRhIHtKU09OfSBvZiB0aGUganVuY3Rpb24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIHVzZUxvZyB7Qm9vbGVhbn0gcGVyZm9ybSBsb2cgdHJhbnNmb3JtYXRpb25cbiAqIEBwYXJhbSBhZGp1c3Qge051bWJlcn0gZm9yIGhhbmRsaW5nIDAncyB3aGVuIHVzZUxvZyBpcyB0cnVlXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YganVuY3Rpb24gb2JqZWN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VKdW5jdGlvbkV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gJ21lZGlhbkp1bmN0aW9uRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdwYXJzZUp1bmN0aW9uRXhwcmVzc2lvbiBpbnB1dCBlcnJvcicpO1xuXG4gICAgY29uc3QganVuY3Rpb25zID0gZGF0YVthdHRyXTtcblxuICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgWyd0aXNzdWVJZCcsICdqdW5jdGlvbklkJywgJ2RhdGEnLCAnZ2VuY29kZUlkJ10uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFqdW5jdGlvbnNbMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VKdW5jdGlvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6ICcgKyBkO1xuICAgIH0pO1xuXG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4ganVuY3Rpb24gcmVhZCBjb3VudHNcbiAgICBqdW5jdGlvbnMuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICBkLnZhbHVlID0gdXNlTG9nP01hdGgubG9nMTAoTnVtYmVyKGQuZGF0YSArIGFkanVzdCkpOk51bWJlcihkLmRhdGEpO1xuICAgICAgICBkLnggPSBkLmp1bmN0aW9uSWQ7XG4gICAgICAgIGQueSA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLmRhdGEpO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWRcbiAgICB9KTtcblxuICAgIC8vIHNvcnQgYnkgZ2Vub21pYyBsb2NhdGlvbiBpbiBhc2NlbmRpbmcgb3JkZXJcbiAgICByZXR1cm4ganVuY3Rpb25zLnNvcnQoKGEsYik9PntcbiAgICAgICAgaWYgKGEuanVuY3Rpb25JZD5iLmp1bmN0aW9uSWQpIHJldHVybiAxO1xuICAgICAgICBlbHNlIGlmIChhLmp1bmN0aW9uSWQ8Yi5qdW5jdGlvbklkKSByZXR1cm4gLTE7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIHBhcnNlIGlzb2Zvcm0gZXhwcmVzc2lvblxuICogQHBhcmFtIGRhdGFcbiAqIEBwYXJhbSB1c2VMb2dcbiAqIEBwYXJhbSBhZGp1c3RcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VJc29mb3JtRXhwcmVzc2lvbihkYXRhLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGF0dHIgPSAnaXNvZm9ybUV4cHJlc3Npb24nO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdygncGFyc2VJc29mb3JtRXhwcmVzc2lvbiBpbnB1dCBlcnJvcicpO1xuICAgIC8vIHBhcnNlIEdURXggaXNvZm9ybSBtZWRpYW4gVFBNXG4gICAgZGF0YVthdHRyXS5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIoZC5kYXRhICsgYWRqdXN0KSk6TnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLmRhdGEpO1xuICAgICAgICBkLnggPSBkLnRyYW5zY3JpcHRJZDtcbiAgICAgICAgZC55ID0gZC50aXNzdWVJZDtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUlzb2Zvcm1FeHByZXNzaW9uVHJhbnNwb3NlKGRhdGEsIHVzZUxvZz10cnVlLCBhZGp1c3Q9MSl7XG4gICAgY29uc3QgYXR0ciA9ICdpc29mb3JtRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdwYXJzZUlzb2Zvcm1FeHByZXNzaW9uIGlucHV0IGVycm9yJyk7XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueSA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBwYXJzZSBtZWRpYW4gZ2VuZSBleHByZXNzaW9uXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn0gd2l0aCBhdHRyIG1lZGlhbkdlbmVFeHByZXNzaW9uXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtcyBsb2cxMCB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhbkV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUpe1xuICAgIGNvbnN0IGF0dHIgPSAnbWVkaWFuR2VuZUV4cHJlc3Npb24nO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAncGFyc2VNZWRpYW5FeHByZXNzaW9uIGlucHV0IGVycm9yLic7XG4gICAgY29uc3QgYWRqdXN0ID0gMTtcbiAgICAvLyBwYXJzZSBHVEV4IG1lZGlhbiBnZW5lIGV4cHJlc3Npb25cbiAgICAvLyBlcnJvci1jaGVja2luZyB0aGUgcmVxdWlyZWQgYXR0cmlidXRlczpcbiAgICBpZiAoZGF0YVthdHRyXS5sZW5ndGggPT0gMCkgdGhyb3cgJ3BhcnNlTWVkaWFuRXhwcmVzc2lvbiBmaW5kcyBubyBkYXRhLic7XG4gICAgWydtZWRpYW4nLCAndGlzc3VlSWQnLCAnZ2VuY29kZUlkJ10uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFkYXRhW2F0dHJdWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBgcGFyc2VNZWRpYW5FeHByZXNzaW9uIGF0dHIgZXJyb3IuICR7ZH0gaXMgbm90IGZvdW5kYDtcbiAgICB9KTtcbiAgICBsZXQgcmVzdWx0cyA9IGRhdGFbYXR0cl07XG4gICAgcmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uKGQpe1xuICAgICAgICBkLnZhbHVlID0gdXNlTG9nP01hdGgubG9nMTAoTnVtYmVyKGQubWVkaWFuKSArIGFkanVzdCk6TnVtYmVyKGQubWVkaWFuKTtcbiAgICAgICAgZC54ID0gZC50aXNzdWVJZDtcbiAgICAgICAgZC55ID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLm1lZGlhbik7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZDtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIHBhcnNlIHRoZSBnZW5lIGV4cHJlc3Npb25cbiAqIEBwYXJhbSBnZW5jb2RlSWQge1N0cmluZ31cbiAqIEBwYXJhbSBkYXRhIHtKc29ufSB3aXRoIGF0dHI6IHRpc3N1ZUlkLCBnZW5lU3ltYm9sXG4gKiBAcmV0dXJucyB7e2V4cDoge30sIGdlbmVTeW1ib2w6IHN0cmluZ319XG4gKi9cbi8vIGZ1bmN0aW9uIHBhcnNlR2VuZUV4cHJlc3Npb24oZ2VuY29kZUlkLCBkYXRhKXtcbi8vICAgICBsZXQgbG9va3VwVGFibGUgPSB7XG4vLyAgICAgICAgIGV4cDoge30sIC8vIGluZGV4ZWQgYnkgdGlzc3VlSWRcbi8vICAgICAgICAgZ2VuZVN5bWJvbDogJydcbi8vICAgICB9O1xuLy8gICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAoJ3BhcnNlR2VuZUV4cHJlc3Npb24gaW5wdXQgZXJyb3IuJyk7XG4vLyAgICAgZGF0YVthdHRyXS5mb3JFYWNoKChkKT0+e1xuLy8gICAgICAgICBpZiAoZC5nZW5jb2RlSWQgPT0gZ2VuY29kZUlkKSB7XG4vLyAgICAgICAgICAgICAvLyBpZiB0aGUgZ2VuY29kZSBJRCBtYXRjaGVzIHRoZSBxdWVyeSBnZW5jb2RlSWQsXG4vLyAgICAgICAgICAgICAvLyBhZGQgdGhlIGV4cHJlc3Npb24gZGF0YSB0byB0aGUgbG9va3VwIHRhYmxlXG4vLyAgICAgICAgICAgICBsb29rdXBUYWJsZS5leHBbZC50aXNzdWVJZF0gPSBkLmRhdGE7XG4vLyAgICAgICAgICAgICBpZiAoJycgPT0gbG9va3VwVGFibGUuZ2VuZVN5bWJvbCkgbG9va3VwVGFibGUuZ2VuZVN5bWJvbCA9IGQuZ2VuZVN5bWJvbFxuLy8gICAgICAgICB9XG4vLyAgICAgfSk7XG4vLyAgICAgcmV0dXJuIGxvb2t1cFRhYmxlXG4vLyB9XG5cbi8qKlxuICogcGFyc2UgdGhlIGV4cHJlc3Npb24gZGF0YSBvZiBhIGdlbmUgZm9yIGEgZ3JvdXBlZCB2aW9saW4gcGxvdFxuICogQHBhcmFtIGRhdGEge0pTT059IGZyb20gR1RFeCBnZW5lIGV4cHJlc3Npb24gd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSBjb2xvcnMge0RpY3Rpb25hcnl9IHRoZSB2aW9saW4gY29sb3IgZm9yIGdlbmVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUdlbmVFeHByZXNzaW9uRm9yVmlvbGluKGRhdGEsIHVzZUxvZz10cnVlLCBjb2xvcnM9dW5kZWZpbmVkKXtcbiAgICBjb25zdCBhdHRyID0gJ2dlbmVFeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ3BhcnNlR2VuZUV4cHJlc3Npb25Gb3JWaW9saW4gaW5wdXQgZXJyb3IuJztcbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIGQudmFsdWVzID0gdXNlTG9nP2QuZGF0YS5tYXAoKGRkKT0+e3JldHVybiBNYXRoLmxvZzEwKCtkZCsxKX0pOmQuZGF0YTtcbiAgICAgICAgZC5ncm91cCA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQubGFiZWwgPSBkLmdlbmVTeW1ib2w7XG4gICAgICAgIGQuY29sb3IgPSBjb2xvcnM9PT11bmRlZmluZWQ/JyM5MGMxYzEnOmNvbG9yc1tkLmdlbmNvZGVJZF07XG4gICAgfSk7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG4iLCIvKipcbiAqIENyZWF0ZXMgYW4gU1ZHXG4gKiBAcGFyYW0gaWQge1N0cmluZ30gYSBET00gZWxlbWVudCBJRCB0aGF0IHN0YXJ0cyB3aXRoIGEgXCIjXCJcbiAqIEBwYXJhbSB3aWR0aCB7TnVtZXJpY31cbiAqIEBwYXJhbSBoZWlnaHQge051bWVyaWN9XG4gKiBAcGFyYW0gbWFyZ2luIHtPYmplY3R9IHdpdGggdHdvIGF0dHJpYnV0ZXM6IHdpZHRoIGFuZCBoZWlnaHRcbiAqIEByZXR1cm4ge1NlbGVjdGlvbn0gdGhlIGQzIHNlbGVjdGlvbiBvYmplY3Qgb2YgdGhlIFNWR1xuICovXG5cbmltcG9ydCB7c2VsZWN0fSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBpZCB7U3RyaW5nfSB0aGUgcGFyZW50IGRvbSBJRFxuICogQHBhcmFtIHdpZHRoIHtOdW1lcmljfVxuICogQHBhcmFtIGhlaWdodCB7TnVtZXJpY31cbiAqIEBwYXJhbSBtYXJnaW4ge09iamVjdH0gd2l0aCBhdHRyOiBsZWZ0LCB0b3BcbiAqIEBwYXJhbSBzdmdJZCB7U3RyaW5nfVxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTdmcoaWQsIHdpZHRoLCBoZWlnaHQsIG1hcmdpbiwgc3ZnSWQ9dW5kZWZpbmVkKXtcbiAgICBpZiAoc3ZnSWQ9PT11bmRlZmluZWQpIHN2Z0lkPWAke2lkfS1zdmdgO1xuICAgIHJldHVybiBzZWxlY3QoXCIjXCIraWQpLmFwcGVuZChcInN2Z1wiKVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgICAgIC5hdHRyKFwiaWRcIiwgc3ZnSWQpXG4gICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoJHttYXJnaW4ubGVmdH0sICR7bWFyZ2luLnRvcH0pYClcbn1cblxuLyoqXG4gKlxuICogQHBhcmFtIHN2Z09ialxuICogQHBhcmFtIGRvd25sb2FkRmlsZU5hbWUge1N0cmluZ31cbiAqIEBwYXJhbSB0ZW1wRG93bmxvYWREaXZJZCB7U3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZG93bmxvYWRTdmcoc3ZnT2JqLCBkb3dubG9hZEZpbGVOYW1lLCB0ZW1wRG93bmxvYWREaXZJZCl7XG4gICAgY29uc29sZS5sb2coc3ZnT2JqKTtcbiAgICB2YXIgJHN2Z0NvcHkgPSBzdmdPYmouY2xvbmUoKVxuICAgIC5hdHRyKFwidmVyc2lvblwiLCBcIjEuMVwiKVxuICAgIC5hdHRyKFwieG1sbnNcIiwgXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiKTtcblxuICAgIC8vIHBhcnNlIGFuZCBhZGQgdGhlIENTUyBzdHlsaW5nIHVzZWQgYnkgdGhlIFNWR1xuICAgIHZhciBzdHlsZXMgPSBwYXJzZUNzc1N0eWxlcyhzdmdPYmouZ2V0KCkpO1xuICAgICRzdmdDb3B5LnByZXBlbmQoc3R5bGVzKTtcblxuICAgICQoXCIjXCIgKyB0ZW1wRG93bmxvYWREaXZJZCkuaHRtbCgnJykuaGlkZSgpO1xuICAgIHZhciBzdmdIdG1sID0gJChcIiNcIiArIHRlbXBEb3dubG9hZERpdklkKS5hcHBlbmQoJHN2Z0NvcHkpLmh0bWwoKTtcblxuICAgIHZhciBzdmdCbG9iID0gbmV3IEJsb2IoW3N2Z0h0bWxdLCB7dHlwZTogXCJpbWFnZS9zdmcreG1sXCJ9KTtcbiAgICBzYXZlQXMoc3ZnQmxvYiwgZG93bmxvYWRGaWxlTmFtZSk7XG5cbiAgICAvLyBjbGVhciB0aGUgdGVtcCBkb3dubG9hZCBkaXZcbiAgICAkKFwiI1wiICsgdGVtcERvd25sb2FkRGl2SWQpLmh0bWwoJycpLmhpZGUoKTtcbn1cbi8qKlxuICogQSBmdW5jdGlvbiBmb3IgcGFyc2luZyB0aGUgQ1NTIHN0eWxlIHNoZWV0IGFuZCBpbmNsdWRpbmcgdGhlIHN0eWxlIHByb3BlcnRpZXMgaW4gdGhlIGRvd25sb2FkYWJsZSBTVkcuXG4gKiBAcGFyYW0gZG9tXG4gKiBAcmV0dXJucyB7RWxlbWVudH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQ3NzU3R5bGVzIChkb20pIHtcbiAgICB2YXIgdXNlZCA9IFwiXCI7XG4gICAgdmFyIHNoZWV0cyA9IGRvY3VtZW50LnN0eWxlU2hlZXRzO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaGVldHMubGVuZ3RoOyBpKyspIHsgLy8gVE9ETzogd2FsayB0aHJvdWdoIHRoaXMgYmxvY2sgb2YgY29kZVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoc2hlZXRzW2ldLmNzc1J1bGVzID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIHJ1bGVzID0gc2hlZXRzW2ldLmNzc1J1bGVzO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJ1bGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJ1bGUgPSBydWxlc1tqXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mKHJ1bGUuc3R5bGUpICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1zO1xuICAgICAgICAgICAgICAgICAgICAvL1NvbWUgc2VsZWN0b3JzIHdvbid0IHdvcmssIGFuZCBtb3N0IG9mIHRoZXNlIGRvbid0IG1hdHRlci5cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1zID0gJChkb20pLmZpbmQocnVsZS5zZWxlY3RvclRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZWQgKz0gcnVsZS5zZWxlY3RvclRleHQgKyBcIiB7IFwiICsgcnVsZS5zdHlsZS5jc3NUZXh0ICsgXCIgfVxcblwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBJbiBGaXJlZm94LCBpZiBzdHlsZXNoZWV0IG9yaWdpbmF0ZXMgZnJvbSBhIGRpZmYgZG9tYWluLFxuICAgICAgICAgICAgLy8gdHJ5aW5nIHRvIGFjY2VzcyB0aGUgY3NzUnVsZXMgd2lsbCB0aHJvdyBhIFNlY3VyaXR5RXJyb3IuXG4gICAgICAgICAgICAvLyBIZW5jZSwgd2UgbXVzdCB1c2UgYSB0cnkvY2F0Y2ggdG8gaGFuZGxlIHRoaXMgaW4gRmlyZWZveFxuICAgICAgICAgICAgaWYgKGUubmFtZSAhPT0gJ1NlY3VyaXR5RXJyb3InKSB0aHJvdyBlO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgcy5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dC9jc3MnKTtcbiAgICBzLmlubmVySFRNTCA9IFwiPCFbQ0RBVEFbXFxuXCIgKyB1c2VkICsgXCJcXG5dXT5cIjtcblxuICAgIHJldHVybiBzO1xufVxuIiwiLyoqXG4gKiBDcmVhdGUgYSB0b29sYmFyXG4gKiBUaGlzIGNsYXNzIHVzZXMgYSBsb3Qgb2YgalF1ZXJ5IGZvciBkb20gZWxlbWVudCBtYW5pcHVsYXRpb25cbiAqL1xuXG5pbXBvcnQge3NlbGVjdH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHtwYXJzZUNzc1N0eWxlc30gZnJvbSBcIi4vdXRpbHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVG9vbGJhciB7XG4gICAgY29uc3RydWN0b3IoZG9tSWQsIHRvb2x0aXA9dW5kZWZpbmVkLCB2ZXJ0aWNhbD1mYWxzZSl7XG4gICAgICAgICQoYCMke2RvbUlkfWApLnNob3coKTsgLy8gaWYgaGlkZGVuXG5cbiAgICAgICAgLy8gYWRkIGEgbmV3IGJhcmdyb3VwIGRpdiB0byBkb21JRCB3aXRoIGJvb3RzdHJhcCBidXR0b24gY2xhc3Nlc1xuICAgICAgICBjb25zdCBidG5DbGFzc2VzID0gdmVydGljYWw/J2J0bi1ncm91cC12ZXJ0aWNhbCBidG4tZ3JvdXAtc20nOiAnYnRuLWdyb3VwIGJ0bi1ncm91cC1zbSc7XG4gICAgICAgIHRoaXMuYmFyID0gJCgnPGRpdi8+JykuYWRkQ2xhc3MoYnRuQ2xhc3NlcykuYXBwZW5kVG8oYCMke2RvbUlkfWApO1xuICAgICAgICB0aGlzLmJ1dHRvbnMgPSB7fTtcbiAgICAgICAgdGhpcy50b29sdGlwID0gdG9vbHRpcDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBkb3dubG9hZCBidXR0b24gZm9yIFNWR1xuICAgICAqIEBwYXJhbSBpZCB7U3RyaW5nfSB0aGUgYnV0dG9uIGRvbSBJRFxuICAgICAqIEBwYXJhbSBzdmdJZCB7U3RyaW5nfSB0aGUgU1ZHIGRvbSBJRCB0byBncmFiIGFuZCBkb3dubG9hZFxuICAgICAqIEBwYXJhbSBvdXRmaWxlTmFtZSB7U3RyaW5nfSB0aGUgZG93bmxvYWQgZmlsZSBuYW1lXG4gICAgICogQHBhcmFtIGNsb25lSWQge1N0cmluZ30gdGhlIGNsb25lZCBTVkcgZG9tIElEXG4gICAgICogQHBhcmFtIGljb24ge1N0cmluZ30gYSBmb250YXdlc29tZSdzIGljb24gY2xhc3MgbmFtZVxuICAgICAqL1xuICAgIGNyZWF0ZURvd25sb2FkU3ZnQnV0dG9uKGlkLCBzdmdJZCwgb3V0ZmlsZU5hbWUsIGNsb25lSWQsIGljb249J2ZhLWRvd25sb2FkJyl7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSB0aGlzLmNyZWF0ZUJ1dHRvbihpZCwgaWNvbik7XG4gICAgICAgIHNlbGVjdChgIyR7aWR9YClcbiAgICAgICAgICAgIC5vbignY2xpY2snLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRTdmcoc3ZnSWQsIG91dGZpbGVOYW1lLCBjbG9uZUlkKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ21vdXNlb3ZlcicsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLnNob3coXCJEb3dubG9hZFwiKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ21vdXNlb3V0JywgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2x0aXAuaGlkZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY3JlYXRlUmVzZXRCdXR0b24oaWQsIGNhbGxiYWNrLCBpY29uPSdmYS1leHBhbmQtYXJyb3dzLWFsdCcpe1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gdGhpcy5jcmVhdGVCdXR0b24oaWQsIGljb24pO1xuICAgICAgICBzZWxlY3QoYCMke2lkfWApXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgY2FsbGJhY2spXG4gICAgICAgICAgICAub24oJ21vdXNlb3ZlcicsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLnNob3coXCJSZXNldCB0aGUgc2NhbGVzXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdXQnLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHRpcC5oaWRlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjcmVhdGUgYSBidXR0b24gdG8gdGhlIHRvb2xiYXJcbiAgICAgKiBAcGFyYW0gaWQge1N0cmluZ30gdGhlIGJ1dHRvbidzIGlkXG4gICAgICogQHBhcmFtIGljb24ge1N0cmluZ30gYSBmb250YXdlc29tZSBpY29uIGNsYXNzXG4gICAgICogRGVwZW5kZW5jaWVzOiBCb290c3RyYXAsIGpRdWVyeSwgRm9udGF3ZXNvbWVcbiAgICAgKi9cbiAgICBjcmVhdGVCdXR0b24oaWQsIGljb249J2ZhLWRvd25sb2FkJyl7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCc8YS8+JykuYXR0cignaWQnLCBpZClcbiAgICAgICAgICAgIC5hZGRDbGFzcygnYnRuIGJ0bi1kZWZhdWx0JykuYXBwZW5kVG8odGhpcy5iYXIpO1xuICAgICAgICAkKCc8aS8+JykuYWRkQ2xhc3MoYGZhICR7aWNvbn1gKS5hcHBlbmRUbygkYnV0dG9uKTtcbiAgICAgICAgdGhpcy5idXR0b25zW2lkXSA9ICRidXR0b247XG4gICAgICAgIHJldHVybiAkYnV0dG9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGF0dGFjaCBhIHRvb2x0aXAgZG9tIHdpdGggdGhlIHRvb2xiYXJcbiAgICAgKiBAcGFyYW0gdG9vbHRpcCB7VG9vbHRpcH1cbiAgICAgKi9cbiAgICBhdHRhY2hUb29sdGlwKHRvb2x0aXApe1xuICAgICAgICB0aGlzLnRvb2x0aXAgPSB0b29sdGlwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkIFNWRyBvYmpcbiAgICAgKiBAcGFyYW0gc3ZnSWQge1N0cmluZ30gdGhlIFNWRyBkb20gSURcbiAgICAgKiBAcGFyYW0gZmlsZU5hbWUge1N0cmluZ30gdGhlIG91dHB1dCBmaWxlIG5hbWVcbiAgICAgKiBAcGFyYW0gY2xvbmVJZCB7U3RyaW5nfSB0aGUgdGVtcG9yYXJ5IGRvbSBJRCB0byBjb3B5IHRoZSBTVkcgdG9cbiAgICAgKiBEZXBlbmRlbmNpZXM6IEZpbGVTYXZlclxuICAgICAqL1xuICAgIGRvd25sb2FkU3ZnKHN2Z0lkLCBmaWxlTmFtZSwgY2xvbmVJZCl7XG4gICAgICAgIC8vIGxldCBzdmdPYmogPSAkKCQoJChgJHtcIiNcIiArc3ZnSWR9IHN2Z2ApKVswXSk7IC8vIGNvbXBsaWNhdGVkIGpRdWVyeSB0byBnZXQgdG8gdGhlIFNWRyBvYmplY3RcbiAgICAgICAgbGV0IHN2Z09iaiA9ICQoJCgkKGAke1wiI1wiICtzdmdJZH1gKSlbMF0pO1xuICAgICAgICBsZXQgJHN2Z0NvcHkgPSBzdmdPYmouY2xvbmUoKVxuICAgICAgICAuYXR0cihcInZlcnNpb25cIiwgXCIxLjFcIilcbiAgICAgICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpO1xuXG4gICAgICAgIC8vIHBhcnNlIGFuZCBhZGQgYWxsIHRoZSBDU1Mgc3R5bGluZyB1c2VkIGJ5IHRoZSBTVkdcbiAgICAgICAgbGV0IHN0eWxlcyA9IHBhcnNlQ3NzU3R5bGVzKHN2Z09iai5nZXQoKSk7XG4gICAgICAgICRzdmdDb3B5LnByZXBlbmQoc3R5bGVzKTtcblxuICAgICAgICAkKFwiI1wiICsgY2xvbmVJZCkuaHRtbCgnJykuaGlkZSgpOyAvLyBtYWtlIHN1cmUgdGhlIGNvcHlJRCBpcyBpbnZpc2libGVcbiAgICAgICAgbGV0IHN2Z0h0bWwgPSAkKGAjJHtjbG9uZUlkfWApLmFwcGVuZCgkc3ZnQ29weSkuaHRtbCgpO1xuXG4gICAgICAgIGxldCBzdmdCbG9iID0gbmV3IEJsb2IoW3N2Z0h0bWxdLCB7dHlwZTogXCJpbWFnZS9zdmcreG1sXCJ9KTtcbiAgICAgICAgc2F2ZUFzKHN2Z0Jsb2IsIGZpbGVOYW1lKTsgLy8gdGhpcyBpcyBhIEZpbGVTYXZlciBmdW5jdGlvbi4uLi5cblxuICAgICAgICAvLyBjbGVhciB0aGUgdGVtcCBkb3dubG9hZCBkaXZcbiAgICAgICAgJChgIyR7Y2xvbmVJZH1gKS5odG1sKCcnKS5oaWRlKCk7XG4gICAgfVxufSIsIid1c2Ugc3RyaWN0JztcbmltcG9ydCB7anNvbiwgdHN2fSBmcm9tICdkMy1mZXRjaCc7XG5pbXBvcnQge3NlbGVjdCwgc2VsZWN0QWxsfSBmcm9tICdkMy1zZWxlY3Rpb24nO1xuaW1wb3J0IHtnZXRHdGV4VXJscyxcbiAgICBwYXJzZVRpc3N1ZXNcbn0gZnJvbSAnLi9tb2R1bGVzL2d0ZXhEYXRhUGFyc2VyJztcbmltcG9ydCBUb29sYmFyIGZyb20gJy4vbW9kdWxlcy9Ub29sYmFyJztcblxuLypcblRPRE86XG5maXJzdCBidWlsZCBhIGRhdGEgbWF0cml4IHdpdGggdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVcbntcbiAgICBjb2w6IHRpc3N1ZXNcbiAgICByb3c6IGRhdGEgdHlwZXNcbiAgICBkYXRhOiBbIG9iamVjdHMgd2l0aCBjb2wgYW5kIHJvdyBhbmQgdmFsdWUgXVxufVxuICovXG4vKipcbiAqIGJ1aWxkIHRoZSBkYXRhIG1hdHJpeCB0YWJsZVxuICogQHBhcmFtIHRhYmxlSWQge1N0cmluZ31cbiAqIEBwYXJhbSBkYXRhc2V0SWQge1N0cmluZ31cbiAqIEBwYXJhbSB1cmxzXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGxhdW5jaCh0YWJsZUlkLCBkYXRhc2V0SWQ9J2d0ZXhfdjcnLCB1cmxzPWdldEd0ZXhVcmxzKCkpe1xuICAgIGNvbnN0IHByb21pc2VzID0gW1xuICAgICAgICAvLyBUT0RPOiB1cmxzIGZvciBvdGhlciBkYXRhc2V0c1xuICAgICAgICBqc29uKHVybHMudGlzc3VlKSxcbiAgICAgICAgdHN2KHVybHMucm5hc2VxQ3JhbSksXG4gICAgICAgIHRzdih1cmxzLndnc0NyYW0pLFxuICAgICAgICB0c3YodXJscy5zYW1wbGUpLFxuICAgIF07XG5cbiAgICBQcm9taXNlLmFsbChwcm9taXNlcylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oYXJncyl7XG4gICAgICAgICAgICBsZXQgdGlzc3VlcyA9IHBhcnNlVGlzc3VlcyhhcmdzWzBdKTtcbiAgICAgICAgICAgIGNvbnN0IGNyYW0gPSB7XG4gICAgICAgICAgICAgICAgcm5hc2VxOiBhcmdzWzFdLnJlZHVjZSgoYSwgZCk9PnthW2Quc2FtcGxlX2lkXT1kOyByZXR1cm4gYTt9LCB7fSksXG4gICAgICAgICAgICAgICAgd2dzOiBhcmdzWzJdLnJlZHVjZSgoYSwgZCk9PnthW2Quc2FtcGxlX2lkXT1kOyByZXR1cm4gYTt9LCB7fSlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsZXQgc2FtcGxlcyA9IGFyZ3NbM11cbiAgICAgICAgICAgICAgICAuZmlsdGVyKChzKT0+cy5kYXRhc2V0SWQ9PWRhdGFzZXRJZClcbiAgICAgICAgICAgICAgICAubWFwKChzKT0+e1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHMuZGF0YVR5cGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIldHU1wiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcy5jcmFtRmlsZSA9IGNyYW0ud2dzW3Muc2FtcGxlSWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlJOQVNFUVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcy5jcmFtRmlsZSA9IGNyYW0ucm5hc2VxW3Muc2FtcGxlSWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IHRoZU1hdHJpeCA9IF9idWlsZE1hdHJpeChkYXRhc2V0SWQsIHNhbXBsZXMsIHRpc3N1ZXMpO1xuXG4gICAgICAgICAgICBfcmVuZGVyTWF0cml4VGFibGUodGFibGVJZCwgdGhlTWF0cml4KTtcbiAgICAgICAgICAgIF9hZGRGaWx0ZXJzKHRhYmxlSWQsIHRoZU1hdHJpeCwgc2FtcGxlcywgdGlzc3Vlcyk7XG5cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7Y29uc29sZS5lcnJvcihlcnIpfSk7XG59XG5cbmZ1bmN0aW9uIF9hZGRGaWx0ZXJzKHRhYmxlSWQsIG1hdCwgc2FtcGxlcywgdGlzc3Vlcyl7XG4gICAgY29uc3QgX19maWx0ZXIgPSAoKT0+e1xuICAgICAgICBjb25zdCBzZXggPSBzZWxlY3QoJ2lucHV0W25hbWU9XCJzZXhcIl06Y2hlY2tlZCcpLm5vZGUoKS52YWx1ZTtcbiAgICAgICAgY29uc3QgYWdlID0gc2VsZWN0KCdpbnB1dFtuYW1lPVwiYWdlXCJdOmNoZWNrZWQnKS5ub2RlKCkudmFsdWU7XG4gICAgICAgIGlmIChzZXggPT0gJ2JvdGgnICYmIGFnZSA9PSAnYWxsJyl7XG4gICAgICAgICAgICBfcmVuZGVyTWF0cml4VGFibGUodGFibGVJZCwgX2J1aWxkTWF0cml4KG1hdC5kYXRhc2V0SWQsIHNhbXBsZXMsIHRpc3N1ZXMpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBmaWx0ZXJlZE1hdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChzZXggPT0gJ2JvdGgnKSBmaWx0ZXJlZE1hdCA9IF9idWlsZE1hdHJpeChtYXQuZGF0YXNldElkLCBzYW1wbGVzLmZpbHRlcihzPT5zLmFnZUJyYWNrZXQ9PWFnZSksIHRpc3N1ZXMpO1xuICAgICAgICAgICAgZWxzZSBpZiAoYWdlID09ICdhbGwnKSBmaWx0ZXJlZE1hdCA9IF9idWlsZE1hdHJpeChtYXQuZGF0YXNldElkLCBzYW1wbGVzLmZpbHRlcihzPT5zLnNleD09c2V4KSwgdGlzc3Vlcyk7XG4gICAgICAgICAgICBlbHNlIGZpbHRlcmVkTWF0ID0gX2J1aWxkTWF0cml4KG1hdC5kYXRhc2V0SWQsIHNhbXBsZXMuZmlsdGVyKHM9PnMuc2V4PT1zZXggJiYgcy5hZ2VCcmFja2V0PT1hZ2UpLCB0aXNzdWVzKTtcbiAgICAgICAgICAgIF9yZW5kZXJNYXRyaXhUYWJsZSh0YWJsZUlkLCBmaWx0ZXJlZE1hdCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHNlbGVjdCgnI2ZpbHRlci1tZW51Jykuc2VsZWN0QWxsKCdpbnB1dFtuYW1lPVwic2V4XCJdJykub24oJ2NoYW5nZScsIF9fZmlsdGVyKTtcbiAgICBzZWxlY3QoJyNmaWx0ZXItbWVudScpLnNlbGVjdEFsbCgnaW5wdXRbbmFtZT1cImFnZVwiXScpLm9uKCdjaGFuZ2UnLCBfX2ZpbHRlcik7XG59XG5cbmZ1bmN0aW9uIF9idWlsZE1hdHJpeChkYXRhc2V0SWQsIHNhbXBsZXMsIHRpc3N1ZXMpe1xuICAgIGNvbnN0IF9fYnVpbGRIYXNoID0gZnVuY3Rpb24oZGF0YVR5cGUpe1xuICAgICAgICByZXR1cm4gc2FtcGxlcy5maWx0ZXIoKHMpPT5zLmRhdGFUeXBlPT1kYXRhVHlwZSkucmVkdWNlKChhLCBkKT0+e1xuICAgICAgICAgICAgaWYoYVtkLnRpc3N1ZUlkXT09PXVuZGVmaW5lZCkgYVtkLnRpc3N1ZUlkXSA9IDA7XG4gICAgICAgICAgICBhW2QudGlzc3VlSWRdPSBhW2QudGlzc3VlSWRdKzE7XG4gICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgfSwge30pO1xuICAgIH07XG4gICAgY29uc3QgY29sdW1ucyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6ICdSTkEtU2VxJyxcbiAgICAgICAgICAgIGlkOiAnUk5BU0VRJyxcbiAgICAgICAgICAgIGRhdGE6IF9fYnVpbGRIYXNoKCdSTkFTRVEnKVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBsYWJlbDogJ1dFUycsXG4gICAgICAgICAgICBpZDogJ1dFUycsXG4gICAgICAgICAgICBkYXRhOiBfX2J1aWxkSGFzaCgnV0VTJylcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6ICdXR1MnLFxuICAgICAgICAgICAgaWQ6ICdXR1MnLFxuICAgICAgICAgICAgZGF0YTogX19idWlsZEhhc2goJ1dHUycpXG4gICAgICAgIH1cbiAgICBdO1xuICAgIGNvbnN0IHJvd3MgPSB0aXNzdWVzLm1hcCgodCk9PntcbiAgICAgICAgdC5pZCA9IHQudGlzc3VlSWQ7XG4gICAgICAgIHQubGFiZWwgPSB0LnRpc3N1ZU5hbWU7XG4gICAgICAgIGNvbHVtbnMuZm9yRWFjaCgoY29sKT0+e1xuICAgICAgICAgICAgdFtjb2wuaWRdID0gY29sLmRhdGFbdC5pZF0gfHwgdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBkYXRhc2V0SWQ6IGRhdGFzZXRJZCxcbiAgICAgICAgWDogcm93cyxcbiAgICAgICAgWTogY29sdW1ucyxcbiAgICAgICAgZGF0YTogc2FtcGxlc1xuICAgIH07XG59XG5cblxuLyoqXG4gKiBSZW5kZXIgdGhlIG1hdHJpeCBpbiBhbiBIVE1MIHRhYmxlIGZvcm1hdFxuICogQHBhcmFtIHRhYmxlSWQge1N0cmluZ30gdGhlIERPTSBJRCBvZiB0aGUgdGFibGVcbiAqIEBwYXJhbSBtYXQge09iamVjdH0gb2YgYXR0cjogZGF0YXNldElkLCBYLS1hIGxpc3Qgb2YgeCBvYmplY3RzLCBZLS1hIGxpc3Qgb2YgeSBvYmplY3RzXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfcmVuZGVyTWF0cml4VGFibGUodGFibGVJZCwgbWF0KXtcbiAgICBjb25zdCBkYXRhc2V0ID0ge1xuICAgICAgICAnZ3RleF92Nyc6IHtcbiAgICAgICAgICAgIGxhYmVsOidHVEVYIFY3JyxcbiAgICAgICAgICAgIGJnY29sb3I6ICcjMmE3MThiJ1xuICAgICAgICB9XG4gICAgfTtcbiAgICAvLyByZW5kZXJpbmcgdGhlIGNvbHVtbiBsYWJlbHNcbiAgICBjb25zdCB0aGVUYWJsZSA9IHNlbGVjdChgIyR7dGFibGVJZH1gKTtcbiAgICB0aGVUYWJsZS5zZWxlY3QoJ3RoZWFkJykuc2VsZWN0QWxsKCd0aCcpXG4gICAgICAgIC5kYXRhKFt7bGFiZWw6XCJcIiwgaWQ6XCJcIn1dLmNvbmNhdChtYXQuWSkpXG4gICAgICAgIC5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoJ3RoJylcbiAgICAgICAgLmF0dHIoJ3Njb3BlJywgJ2NvbCcpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsIChkLCBpKT0+ZC5pZD09XCJcIj8nJzpgeSR7aS0xfWApXG4gICAgICAgIC50ZXh0KChkKT0+ZC5sYWJlbCk7XG5cbiAgICB0aGVUYWJsZS5zZWxlY3QoJy50YWJsZS1sYWJlbCcpLnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xuICAgIHRoZVRhYmxlLnNlbGVjdCgnLnRhYmxlLWxhYmVsJykuYXBwZW5kKCd0aCcpXG4gICAgICAgIC5hdHRyKCdjb2xzcGFuJywgbWF0LlkubGVuZ3RoICsgMSlcbiAgICAgICAgLnRleHQoZGF0YXNldFttYXQuZGF0YXNldElkXS5sYWJlbClcbiAgICAgICAgLnN0eWxlKCdiYWNrZ3JvdW5kLWNvbG9yJyxkYXRhc2V0W21hdC5kYXRhc2V0SWRdLmJnY29sb3IpO1xuXG4gICAgX3JlbmRlckNvdW50cyh0aGVUYWJsZS5zZWxlY3QoJ3Rib2R5JyksIG1hdCk7XG4gICAgX2FkZENsaWNrRXZlbnRzKHRhYmxlSWQpO1xuICAgIF9hZGRUb29sYmFyKHRhYmxlSWQsIG1hdCk7XG59XG5cbmZ1bmN0aW9uIF9yZW5kZXJDb3VudHModGJvZHksIG1hdCl7XG4gICAgdGJvZHkuc2VsZWN0QWxsKCcuZGF0YS1yb3cnKS5yZW1vdmUoKTtcbiAgICBjb25zdCB0aGVSb3dzID0gdGJvZHkuc2VsZWN0QWxsKCcuZGF0YS1yb3cnKVxuICAgICAgICAuZGF0YShtYXQuWClcbiAgICAgICAgLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgndHInKVxuICAgICAgICAuY2xhc3NlZCgnZGF0YS1yb3cnLCB0cnVlKTtcblxuICAgIC8vIHJlbmRlcmluZyB0aGUgcm93IGxhYmVsXG4gICAgdGhlUm93cy5hcHBlbmQoJ3RoJylcbiAgICAgICAgLmF0dHIoJ3Njb3BlJywgJ3JvdycpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsIChkLCBpKT0+YHgke2l9YClcbiAgICAgICAgLnRleHQoKGQpPT5kLmxhYmVsKTtcblxuICAgIG1hdC5ZLmZvckVhY2goKHksIGopPT57XG4gICAgICAgIHRoZVJvd3MuYXBwZW5kKCd0ZCcpXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAoZCwgaSk9PntcbiAgICAgICAgICAgICAgICByZXR1cm4gZFt5LmlkXT09PXVuZGVmaW5lZD8nJzpgeCR7aX0geSR7an1gO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50ZXh0KChkKT0+ZFt5LmlkXXx8JycpO1xuICAgIH0pO1xuXG59XG5cbi8qKlxuICogQWRkIGN1c3RvbWl6ZWQgY29sdW1uLCByb3cgYW5kIGNlbGwgY2xpY2sgZXZlbnRzXG4gKiBAcGFyYW0gdGFibGVJZCB7U3RyaW5nfSB0aGUgZG9tIElEIG9mIHRoZSB0YWJsZVxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2FkZENsaWNrRXZlbnRzKHRhYmxlSWQpe1xuICAgIGNvbnN0IHRoZUNlbGxzID0gc2VsZWN0KGAjJHt0YWJsZUlkfWApLnNlbGVjdCgndGJvZHknKS5zZWxlY3RBbGwoJ3RkJyk7XG5cbiAgICAvLyBjb2x1bW4gbGFiZWxzXG4gICAgc2VsZWN0KGAjJHt0YWJsZUlkfWApLnNlbGVjdCgndGhlYWQnKS5zZWxlY3RBbGwoJ3RoJylcbiAgICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpXG4gICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgLy8gdG9nZ2xlIHRoZSBzZWxlY3Rpb25cbiAgICAgICAgICAgY29uc3QgdGhlQ29sdW1uID0gc2VsZWN0KHRoaXMpLmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgICAgIGlmIChzZWxlY3QodGhpcykuYXR0cignc2NvcGUnKSA9PSAnY29sJykge1xuICAgICAgICAgICAgICAgc2VsZWN0KHRoaXMpLmF0dHIoJ3Njb3BlJywgJ3NlbGVjdGVkJyk7XG4gICAgICAgICAgICAgICB0aGVDZWxscy5maWx0ZXIoYC4ke3RoZUNvbHVtbn1gKS5jbGFzc2VkKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgc2VsZWN0KHRoaXMpLmF0dHIoJ3Njb3BlJywgJ2NvbCcpO1xuICAgICAgICAgICAgICAgdGhlQ2VsbHMuZmlsdGVyKGAuJHt0aGVDb2x1bW59YCkuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICAgICAgIH1cbiAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhlQ29sdW1uKTtcbiAgICAgICAgfSk7XG5cbiAgICAvLyByb3cgbGFiZWxzXG4gICAgc2VsZWN0KGAjJHt0YWJsZUlkfWApLnNlbGVjdCgndGJvZHknKS5zZWxlY3RBbGwoJ3RoJylcbiAgICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpXG4gICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpe1xuICAgICAgICAgICBjb25zdCB0aGVSb3cgPSBzZWxlY3QodGhpcykuYXR0cignY2xhc3MnKTtcbiAgICAgICAgICAgaWYgKHNlbGVjdCh0aGlzKS5hdHRyKCdzY29wZScpID09ICdyb3cnKSB7XG4gICAgICAgICAgICAgICBzZWxlY3QodGhpcykuYXR0cignc2NvcGUnLCAnc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgIHRoZUNlbGxzLmZpbHRlcihgLiR7dGhlUm93fWApLmNsYXNzZWQoJ3NlbGVjdGVkJywgdHJ1ZSk7XG4gICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICBzZWxlY3QodGhpcykuYXR0cignc2NvcGUnLCAncm93Jyk7XG4gICAgICAgICAgICAgICB0aGVDZWxscy5maWx0ZXIoYC4ke3RoZVJvd31gKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGVSb3cpO1xuICAgICAgICB9KTtcblxuXG4gICAgLy8gZGF0YSBjZWxsc1xuICAgIHRoZUNlbGxzLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpXG4gICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgLy8gdG9nZ2xlIHRoZSBzZWxlY3RlZCBjbGFzcyBhc3NpZ25tZW50XG4gICAgICAgICAgICBzZWxlY3QodGhpcykuY2xhc3NlZCgnc2VsZWN0ZWQnLCAhc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ3NlbGVjdGVkJykpO1xuICAgICAgICB9KVxufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gdGFibGVJZFxuICogQHBhcmFtIG1hdFxuICogQHByaXZhdGVcbiAqIFJlZmVyZW5jZTogaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL1xuICovXG5mdW5jdGlvbiBfYWRkVG9vbGJhcih0YWJsZUlkLCBtYXQpe1xuICAgIC8vIFRPRE86IGdldCByaWQgb2YgaGFyZC1jb2RlZCBkb20gSURzXG4gICAgY29uc3QgdGhlQ2VsbHMgPSBzZWxlY3QoYCMke3RhYmxlSWR9YCkuc2VsZWN0KCd0Ym9keScpLnNlbGVjdEFsbCgndGQnKTtcbiAgICBzZWxlY3QoJyNtYXRyaXgtdGFibGUtdG9vbGJhcicpLnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xuICAgIGNvbnN0IHRvb2xiYXIgPSBuZXcgVG9vbGJhcignbWF0cml4LXRhYmxlLXRvb2xiYXInLCB1bmRlZmluZWQsIHRydWUpO1xuICAgIHRvb2xiYXIuY3JlYXRlQnV0dG9uKCdzYW1wbGUtZG93bmxvYWQnKTtcbiAgICB0b29sYmFyLmNyZWF0ZUJ1dHRvbignc2VuZC10by1maXJlY2xvdWQnLCAnZmEtY2xvdWQtdXBsb2FkLWFsdCcpO1xuXG4gICAgc2VsZWN0KCcjc2FtcGxlLWRvd25sb2FkJylcbiAgICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpXG4gICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgbGV0IGNlbGxzID0gdGhlQ2VsbHMuZmlsdGVyKGAuc2VsZWN0ZWRgKTtcbiAgICAgICAgICAgIGlmIChjZWxscy5lbXB0eSgpKSBhbGVydCgnWW91IGhhdmUgbm90IHNlbGVjdGVkIGFueSBzYW1wbGVzIHRvIGRvd25sb2FkLicpO1xuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGRvd25sb2FkQ29udGVudCA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICdTYW1wbGUgSUQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1Rpc3N1ZSBOYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdEYXRhIFR5cGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NSQU0gRmlsZSBHQ1AnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NSQU0gRmlsZSBBV1MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NSQU0gRmlsZSBNRDUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NSQU0gRmlsZSBTaXplJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDUkFNIEluZGV4IEdDUCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnQ1JBTSBJbmRleCBBV1MnXG4gICAgICAgICAgICAgICAgICAgIF0uam9pbihcIlxcdFwiKSArICdcXG4nO1xuICAgICAgICAgICAgICAgIGNlbGxzLmVhY2goZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hcmtlciA9IHNlbGVjdCh0aGlzKS5hdHRyKCdjbGFzcycpLnNwbGl0KCcgJykuZmlsdGVyKChjKT0+e3JldHVybiBjIT0nc2VsZWN0ZWQnfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHggPSBtYXQuWFtwYXJzZUludChtYXJrZXJbMF0ucmVwbGFjZSgneCcsICcnKSldLmlkO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB5ID0gbWF0LllbcGFyc2VJbnQobWFya2VyWzFdLnJlcGxhY2UoJ3knLCAnJykpXS5pZDtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Rvd25sb2FkICcgKyB4ICsgJyA6ICcrIHkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkU2FtcGxlcyA9IG1hdC5kYXRhLmZpbHRlcigocyk9PnMuZGF0YVR5cGU9PXkmJnMudGlzc3VlSWQ9PXgmJnMuZGF0YVR5cGUhPSdXRVMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLyoqKiogV0FSTklORzogbm8gV0VTIGNyYW0gZmlsZXMgYXZhaWxhYmxlIEFUTSAqKioqL1xuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgocyk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY3JhbSA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NyYW1fZmlsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjcmFtX2ZpbGVfYXdzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NyYW1fZmlsZV9tZDUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY3JhbV9maWxlX3NpemUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY3JhbV9pbmRleCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjcmFtX2luZGV4X2F3cydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLm1hcCgoZCk9PnMuY3JhbUZpbGVbZF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb2x1bW5zID0gW3Muc2FtcGxlSWQsIHMudGlzc3VlTmFtZSwgcy5kYXRhVHlwZV0uY29uY2F0KGNyYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb2x1bW5zLmpvaW4oXCJcXHRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coc2VsZWN0ZWRTYW1wbGVzKTtcbiAgICAgICAgICAgICAgICAgICAgZG93bmxvYWRDb250ZW50ICs9IHNlbGVjdGVkU2FtcGxlcy5qb2luKFwiXFxuXCIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGxldCBmaWxlID0gbmV3IEJsb2IoW2Rvd25sb2FkQ29udGVudF0sIHt0eXBlOiAndGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04J30pO1xuICAgICAgICAgICAgICAgIHNhdmVBcyhmaWxlLCAnR1RFeC5jcmFtLnR4dCcsIHRydWUpOyAvLyBzYXZlQXMoKSBpcyBhIEZpbGVTYXZlciBmaWxlLCBkaXNhYmxlIGF1dG8gQk9NXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgIHNlbGVjdCgnI3NlbmQtdG8tZmlyZWNsb3VkJylcbiAgICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpXG4gICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIGxldCBjZWxscyA9IHRoZUNlbGxzLmZpbHRlcihgLnNlbGVjdGVkYCk7XG4gICAgICAgICAgICAgaWYgKGNlbGxzLmVtcHR5KCkpIGFsZXJ0KCdZb3UgaGF2ZSBub3Qgc2VsZWN0ZWQgYW55IHNhbXBsZXMgdG8gZG93bmxvYWQuJyk7XG4gICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgIGNlbGxzLmVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFya2VyID0gc2VsZWN0KHRoaXMpLmF0dHIoJ2NsYXNzJykuc3BsaXQoJyAnKS5maWx0ZXIoKGMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYyAhPSAnc2VsZWN0ZWQnXG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHggPSBtYXQuWFtwYXJzZUludChtYXJrZXJbMF0ucmVwbGFjZSgneCcsICcnKSldLmlkO1xuICAgICAgICAgICAgICAgICAgICAgY29uc3QgeSA9IG1hdC5ZW3BhcnNlSW50KG1hcmtlclsxXS5yZXBsYWNlKCd5JywgJycpKV0uaWQ7XG4gICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRG93bmxvYWQgJyArIHggKyAnIDogJyArIHkpO1xuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgc2VsZWN0KCcjZmlyZS1jbG91ZC1mb3JtJykuc3R5bGUoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG4gICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIHNlbGVjdCgnI3N1Ym1pdC10by1maXJlY2xvdWQtYnRuJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxlY3QoJyNmaXJlLWNsb3VkLWZvcm0nKS5zdHlsZShcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuICAgICAgICAgICAgYWxlcnQoJ1N1Ym1pdHRlZCEnKTtcbiAgICAgICAgfSlcbn1cblxuXG4iXSwibmFtZXMiOlsiY3N2IiwiZHN2IiwidHN2IiwibWF0Y2hlciIsInNlbGVjdGlvbiIsImVsZW1lbnQiXSwibWFwcGluZ3MiOiI7OztBQUFBLElBQUksR0FB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
