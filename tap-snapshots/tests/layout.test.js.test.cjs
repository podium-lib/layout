/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`tests/layout.test.js > TAP > Layout() - rendering using a string - with assets > must match snapshot 1`] = `
<!doctype html>
<html lang="en-US">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=Edge">
        <link href="http://url.com/some/css" type="text/css" rel="stylesheet">
        
        <title>awesome page</title>
        extra head stuff
    </head>
    <body>
        <div>should be wrapped in a doc</div>
        <script src="http://url.com/some/js"></script>
        
    </body>
</html>
`

exports[`tests/layout.test.js > TAP > Layout() - rendering using the html tag - with assets > must match snapshot 1`] = `
<!doctype html>
<html lang="en-US">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=Edge">
        <link href="http://url.com/some/css" type="text/css" rel="stylesheet">
        
        <title>awesome page</title>
        extra head stuff
    </head>
    <body>
        <div>should be wrapped in a doc</div>
        <script src="http://url.com/some/js"></script>
        
    </body>
</html>
`

exports[`tests/layout.test.js > TAP > Layout() - setting a custom view template > must match snapshot 1`] = `
<html><head>extra head stuff</head><body><div>should be wrapped in a doc</div></body></html>
`
