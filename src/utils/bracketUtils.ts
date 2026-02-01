/**
 * Bracket Utility Module
 * Centralized bracket templates and helper functions for tournament brackets
 */

// Tournament bracket HTML templates for different fighter counts (2-22)
export const BRACKET_TEMPLATES: string[] = [
  "", // 0
  "", // 1
  "<div class='brackets-2'><div class='brackets'><div class='group3'><div class='r1'><div></div><div></div></div><div class='r2'><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>1</span><span class='teamb'>2</span></div></div></div><div class='r3'><div id='match-0' class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 2
  "<div class='brackets-3'><div class='brackets'><div class='group3'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div></div><div class='r2'><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>1</span><span class='teamb'></span></div></div></div><div class='r3'><div id='match-0' class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 3
  "<div class='brackets-4'><div class='brackets'><div class='group3'><div class='r1'><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>abc</span><span class='teamb'></span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r2'><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div id='match-0' class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 4
  "<div class='brackets-5'><div class='brackets'><div class='group4'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'></span><span class='teamb'></span></div></div><div></div></div><div class='r2'><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 5
  "<div class='brackets-6'><div class='brackets'><div class='group4'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div><div></div></div><div class='r2'><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 6
  "<div class='brackets-7'><div class='brackets'><div class='group4'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r2'><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 7
  "<div class='brackets-8'><div class='brackets'><div class='group4'><div class='r1'><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r2'><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 8
  "<div class='brackets-9'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div></div><div></div><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div></div><div></div></div><div class='r2'><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>5</span><span class='teamb'></span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>8</span><span class='teamb'>9</span></div></div></div><div class='r3'><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 9
  "<div class='brackets-10'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div></div><div></div></div><div class='r2'><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>9</span><span class='teamb'>10</span></div></div></div><div class='r3'><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 10
  "<div class='brackets-11'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div></div></div><div class='r2'><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'>11</span></div></div></div><div class='r3'><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 11
  "<div class='brackets-12'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>4</span><span class='teamb'>5</span></div><div></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div></div></div><div class='r2'><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>1</span><span class='teamb'></span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'>6</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>7</span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'>12</span></div></div></div><div class='r3'><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 12
  "<div class='brackets-13'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>4</span><span class='teamb'>5</span></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>11</span><span class='teamb'>12</span></div></div><div></div></div><div class='r2'><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>1</span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'>6</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'>13</span></div></div></div><div class='r3'><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 13
  "<div class='brackets-14'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>4</span><span class='teamb'>5</span></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div></div></div><div class='r2'><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>1</span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'>14</span></div></div></div><div class='r3'><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 14
  "<div class='brackets-15'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>4</span><span class='teamb'>5</span></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>14</span><span class='teamb'>15</span></div></div></div><div class='r2'><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>1</span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 15
  "<div class='brackets-16'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>5</span><span class='teamb'>6</span></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>11</span><span class='teamb'>12</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>13</span><span class='teamb'>14</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>15</span><span class='teamb'>16</span></div></div></div><div class='r2'><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 16
  "<div class='brackets-17'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div><div class='r2'><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>5</span><span class='teamb'>6</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>9</span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>14</span><span class='teamb'>15</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>16</span><span class='teamb'>17</span></div></div></div><div class='r3'><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 17
  "<div class='brackets-18'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div></div><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>11</span><span class='teamb'>12</span></div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div><div class='r2'><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>5</span><span class='teamb'></span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>10</span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>13</span><span class='teamb'>14</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>15</span><span class='teamb'>16</span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'>17</span><span class='teamb'>18</span></div></div></div><div class='r3'><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 18
  "<div class='brackets-19'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div></div><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div></div><div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>16</span><span class='teamb'>17</span></div></div><div></div><div></div><div></div><div></div></div><div class='r2'><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>5</span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'>14</span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'>15</span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'>18</span><span class='teamb'>19</span></div></div></div><div class='r3'><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-18' class='bracketbox'><span class='info'>18</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 19
  "<div class='brackets-20'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div></div><div></div><div></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>13</span><span class='teamb'>14</span></div></div><div></div><div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>17</span><span class='teamb'>18</span></div></div><div></div><div></div></div><div class='r2'><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>11</span><span class='teamb'>12</span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'>15</span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'>16</span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'>19</span><span class='teamb'>20</span></div></div></div><div class='r3'><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-18' class='bracketbox'><span class='info'>18</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-19' class='bracketbox'><span class='info'>19</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 20
  "<div class='brackets-21'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div></div><div></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>14</span><span class='teamb'>15</span></div></div><div></div><div></div><div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>19</span><span class='teamb'>20</span></div></div><div></div></div><div class='r2'><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'>11</span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'>16</span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'>17</span><span class='teamb'>18</span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'>21</span></div></div></div><div class='r3'><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-18' class='bracketbox'><span class='info'>18</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-19' class='bracketbox'><span class='info'>19</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-20' class='bracketbox'><span class='info'>20</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 21
  "<div class='brackets-22'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div></div><div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>13</span><span class='teamb'>14</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>15</span><span class='teamb'>16</span></div></div><div></div><div></div><div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>20</span><span class='teamb'>21</span></div></div><div></div></div><div class='r2'><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'>11</span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'>12</span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'>17</span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'>18</span><span class='teamb'>19</span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'>22</span></div></div></div><div class='r3'><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-18' class='bracketbox'><span class='info'>18</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-19' class='bracketbox'><span class='info'>19</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-20' class='bracketbox'><span class='info'>20</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-21' class='bracketbox'><span class='info'>21</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>", // 22
];

// Get bracket HTML for a given number of fighters
export function getBracketTemplate(fighterCount: number): string {
  return BRACKET_TEMPLATES[fighterCount] || '';
}

// Fighter info interface
export interface FighterInfo {
  name: string;
  code: string;
  country?: string;
}

// Combat info interface
export interface CombatInfo {
  match: {
    no: number;
    category: string;
    win?: 'red' | 'blue' | '';
    type?: string;
  };
  fighters: {
    redFighter: FighterInfo;
    blueFighter: FighterInfo;
  };
}

// Calculate fighter wins from combat list
export function calculateFighterWins(combats: CombatInfo[]): { [key: string]: number } {
  const wins: { [key: string]: number } = {};
  
  combats.forEach(combat => {
    const redKey = `${combat.fighters.redFighter.name}|${combat.fighters.redFighter.code}`;
    const blueKey = `${combat.fighters.blueFighter.name}|${combat.fighters.blueFighter.code}`;
    
    if (combat.match.win === 'red') {
      wins[redKey] = (wins[redKey] || 0) + 1;
    } else if (combat.match.win === 'blue') {
      wins[blueKey] = (wins[blueKey] || 0) + 1;
    }
  });
  
  return wins;
}

// Track which matches each fighter participated in
export function trackFighterMatches(combats: CombatInfo[]): { [key: string]: number[] } {
  const matches: { [key: string]: number[] } = {};
  
  combats.forEach((combat, idx) => {
    const matchNo = idx + 1;
    const redKey = `${combat.fighters.redFighter.name}|${combat.fighters.redFighter.code}`;
    const blueKey = `${combat.fighters.blueFighter.name}|${combat.fighters.blueFighter.code}`;
    
    if (!matches[redKey]) matches[redKey] = [];
    if (!matches[blueKey]) matches[blueKey] = [];
    
    matches[redKey].push(matchNo);
    matches[blueKey].push(matchNo);
  });
  
  return matches;
}

// Format fighter display with unit/country
export function formatFighterDisplay(fighter: FighterInfo): string {
  return fighter.country ? `${fighter.name} (${fighter.country})` : fighter.name;
}

// Get unique fighter key
export function getFighterKey(fighter: FighterInfo): string {
  return `${fighter.name}|${fighter.code}`;
}

// Update bracket match info in DOM
export function updateBracketMatchInfo(
  bracketRef: HTMLDivElement,
  combats: CombatInfo[],
  category: string,
  currentMatchNo?: number
): { winner: string; winnerCountry: string } {
  let matchNo = 0;
  let nameWin = '';
  let countryWin = '';
  
  // Filter combats by category
  const filteredCombats = combats.filter(
    c => c.match.category === category || category === 'ALL'
  );
  const totalMatches = filteredCombats.length;
  
  // Calculate wins and match history
  const fighterWins = calculateFighterWins(filteredCombats);
  const fighterMatches = trackFighterMatches(filteredCombats);
  
  // Update each match element
  combats.forEach(combat => {
    if (combat.match.category !== category && category !== 'ALL') return;
    
    // Track winner
    if (combat.match.win === 'red') {
      nameWin = combat.fighters.redFighter.name;
      countryWin = combat.fighters.redFighter.country || '';
    } else if (combat.match.win === 'blue') {
      nameWin = combat.fighters.blueFighter.name;
      countryWin = combat.fighters.blueFighter.country || '';
    }
    
    matchNo++;
    const matchEl = bracketRef.querySelector(`#match-${matchNo}`);
    if (!matchEl) return;
    
    const infoEl = matchEl.querySelector('.info');
    const teamaEl = matchEl.querySelector('.teama') as HTMLElement;
    const teambEl = matchEl.querySelector('.teamb') as HTMLElement;
    
    // Get display names with units
    const redDisplay = formatFighterDisplay(combat.fighters.redFighter);
    const blueDisplay = formatFighterDisplay(combat.fighters.blueFighter);
    const redKey = getFighterKey(combat.fighters.redFighter);
    const blueKey = getFighterKey(combat.fighters.blueFighter);
    
    // Update match number
    if (infoEl) infoEl.textContent = String(combat.match.no);
    
    // Update red fighter
    if (teamaEl) {
      teamaEl.textContent = redDisplay;
      teamaEl.setAttribute('data-fighter', redKey);
      teamaEl.setAttribute('data-matches', (fighterMatches[redKey] || []).join(','));
    }
    
    // Update blue fighter
    if (teambEl) {
      teambEl.textContent = blueDisplay;
      teambEl.setAttribute('data-fighter', blueKey);
      teambEl.setAttribute('data-matches', (fighterMatches[blueKey] || []).join(','));
    }
    
    // Highlight current match
    if (currentMatchNo !== undefined && combat.match.no === currentMatchNo) {
      matchEl.classList.add('current-match');
    } else {
      matchEl.classList.remove('current-match');
    }
  });
  
  // Update final winner
  const finalEl = bracketRef.querySelector('.final .teamc') as HTMLElement;
  if (finalEl && nameWin) {
    finalEl.textContent = countryWin ? `${nameWin} (${countryWin})` : nameWin;
    
    // Find winner's fighter key by looking at the last match winner
    const lastCombat = filteredCombats[filteredCombats.length - 1];
    if (lastCombat) {
      let winnerKey = '';
      if (lastCombat.match.win === 'red') {
        winnerKey = getFighterKey(lastCombat.fighters.redFighter);
      } else if (lastCombat.match.win === 'blue') {
        winnerKey = getFighterKey(lastCombat.fighters.blueFighter);
      }
      
      if (winnerKey) {
        finalEl.setAttribute('data-fighter', winnerKey);
        finalEl.setAttribute('data-matches', (fighterMatches[winnerKey] || []).join(','));
      }
    }
  }
  
  return { winner: nameWin, winnerCountry: countryWin };
}

// Add hover listeners for path highlighting
export function addPathHoverListeners(bracketRef: HTMLDivElement): void {
  // Fighters in matches (teama, teamb)
  const matchFighters = bracketRef.querySelectorAll('.teama[data-fighter], .teamb[data-fighter]');
  matchFighters.forEach(el => {
    el.addEventListener('mouseenter', (e) => handleFighterHover(e, bracketRef, false));
    el.addEventListener('mouseleave', () => handleFighterLeave(bracketRef));
  });
  
  // Winner (teamc) - separate handler, only highlight winner box
  const winnerEl = bracketRef.querySelector('.teamc[data-fighter]');
  if (winnerEl) {
    winnerEl.addEventListener('mouseenter', (e) => handleFighterHover(e, bracketRef, true));
    winnerEl.addEventListener('mouseleave', () => handleFighterLeave(bracketRef));
  }
}

// Handle fighter hover - highlight path
// isWinnerOnly: if true, only highlight winner box, not the matches
function handleFighterHover(e: Event, bracketRef: HTMLDivElement, isWinnerOnly: boolean): void {
  const target = e.target as HTMLElement;
  const fighterKey = target.getAttribute('data-fighter');
  const matchesStr = target.getAttribute('data-matches');
  
  if (!fighterKey) return;
  
  // Add has-hover class to brackets container to dim other matches
  const bracketsContainer = bracketRef.querySelector('.brackets');
  if (bracketsContainer) {
    bracketsContainer.classList.add('has-hover');
    if (isWinnerOnly) {
      bracketsContainer.classList.add('winner-hover');
    }
  }
  
  // If winner, highlight winner box (but continue to also highlight path)
  if (isWinnerOnly) {
    target.classList.add('fighter-highlight');
    // Don't return early - continue to highlight the path
  }
  
  if (!matchesStr) return;
  
  const matches = matchesStr.split(',').map(m => parseInt(m));
  
  // Highlight all matches this fighter participated in
  matches.forEach(matchNo => {
    const matchEl = bracketRef.querySelector(`#match-${matchNo}`);
    if (!matchEl) return;
    
    matchEl.classList.add('path-highlight');
    
    // Highlight the specific fighter in each match
    const teamaEl = matchEl.querySelector('.teama') as HTMLElement;
    const teambEl = matchEl.querySelector('.teamb') as HTMLElement;
    
    if (teamaEl?.getAttribute('data-fighter') === fighterKey) {
      teamaEl.classList.add('fighter-highlight');
    }
    if (teambEl?.getAttribute('data-fighter') === fighterKey) {
      teambEl.classList.add('fighter-highlight');
    }
  });
  
  // Also highlight winner if same fighter
  const winnerEl = bracketRef.querySelector('.teamc[data-fighter]') as HTMLElement;
  if (winnerEl?.getAttribute('data-fighter') === fighterKey) {
    winnerEl.classList.add('fighter-highlight');
  }
}

// Handle fighter leave - remove highlights
function handleFighterLeave(bracketRef: HTMLDivElement): void {
  // Remove has-hover and winner-hover class from brackets container
  const bracketsContainer = bracketRef.querySelector('.brackets');
  if (bracketsContainer) {
    bracketsContainer.classList.remove('has-hover');
    bracketsContainer.classList.remove('winner-hover');
  }
  
  // Remove all path highlights
  bracketRef.querySelectorAll('.path-highlight').forEach(el => {
    el.classList.remove('path-highlight');
  });
  
  // Remove all fighter highlights
  bracketRef.querySelectorAll('.fighter-highlight').forEach(el => {
    el.classList.remove('fighter-highlight');
  });
}

// Count unique fighters from combat list
export function countUniqueFighters(combats: CombatInfo[], category: string): number {
  const fighters: string[] = [];
  
  combats.forEach(combat => {
    if (combat.match.category !== category && category !== 'ALL') return;
    
    const redKey = getFighterKey(combat.fighters.redFighter);
    const blueKey = getFighterKey(combat.fighters.blueFighter);
    
    // Skip placeholder names like "W.1", "L.2"
    if (!combat.fighters.redFighter.name.includes('W.') && 
        !combat.fighters.redFighter.name.includes('L.') &&
        !fighters.includes(redKey)) {
      fighters.push(redKey);
    }
    
    if (!combat.fighters.blueFighter.name.includes('W.') && 
        !combat.fighters.blueFighter.name.includes('L.') &&
        !fighters.includes(blueKey)) {
      fighters.push(blueKey);
    }
  });
  
  return fighters.length;
}
