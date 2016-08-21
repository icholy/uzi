# Robin

> Position elements the way you've always wanted to.


Examples:


### Center in another element.

``` html
<div id="A" r-register>A</div>
<div r-center-in="A">B</div>
```

### Anchor the element to another

``` html
<div id="A" r-register>A</div>
<div r-left="A.right">B</div>
```

### Use expressions

``` html
<div id="A" r-register>A</div>
<div id="B" r-left="A.right + B.width / 2">B</div>
```

### Use JavaScript variables inside expressions

``` html
<div id="A" r-width="x * A.height">A</div>
```

``` js
layout.assign("x", 100);
```

