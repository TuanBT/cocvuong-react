import React, { Component } from 'react';
import $ from 'jquery';
import Firebase from '../firebase';
import { ref, set, get, update, remove, child, onValue } from "firebase/database";
import logo from '../assets/img/logo.png';
import '../assets/lib/table/style.css';
import '../assets/lib/table/basictable.css';

class InformationDkContainer extends Component {
  constructor(props) {
    document.title = 'Thông Tin Đối Kháng';
    super(props);
    const me = this;
    this.state = {
      data: [],
    };
    this.db = Firebase();
    this.combatObj;
    this.tournamentNoIndex = 0;

    this.brackets = [];
    me.brackets.push("");//0
    me.brackets.push("");//1
    me.brackets.push("<div class='brackets-2'><div class='brackets'><div class='group3'><div class='r1'><div></div><div></div></div><div class='r2'><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>1</span><span class='teamb'>2</span></div></div></div><div class='r3'><div id='match-0' class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");//2
    me.brackets.push("<div class='brackets-3'><div class='brackets'><div class='group3'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div></div><div class='r2'><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>1</span><span class='teamb'></span></div></div></div><div class='r3'><div id='match-0' class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");//3
    me.brackets.push("<div class='brackets-4'><div class='brackets'><div class='group3'><div class='r1'><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>abc</span><span class='teamb'></span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r2'><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div id='match-0' class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-5'><div class='brackets'><div class='group4'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'></span><span class='teamb'></span></div></div><div></div></div><div class='r2'><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-6'><div class='brackets'><div class='group4'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div><div></div></div><div class='r2'><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div> ");
    me.brackets.push("<div class='brackets-7'><div class='brackets'><div class='group4'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r2'><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-8'><div class='brackets'><div class='group4'><div class='r1'><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r2'><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-9'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div></div><div></div><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div></div><div></div></div><div class='r2'><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>5</span><span class='teamb'></span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>8</span><span class='teamb'>9</span></div></div></div><div class='r3'><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-10'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div></div><div></div></div><div class='r2'><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>9</span><span class='teamb'>10</span></div></div></div><div class='r3'><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-11'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div></div></div><div class='r2'><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'>11</span></div></div></div><div class='r3'><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-12'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>4</span><span class='teamb'>5</span></div><div></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div></div><div></div><div></div></div><div class='r2'><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>1</span><span class='teamb'></span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'>6</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>7</span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'>12</span></div></div></div><div class='r3'><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-13'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>4</span><span class='teamb'>5</span></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>11</span><span class='teamb'>12</span></div></div><div></div><div></div><div></div></div><div class='r2'><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>1</span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'>6</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'>13</span></div></div></div><div class='r3'><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-14'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>4</span><span class='teamb'>5</span></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div></div><div></div><div></div></div><div class='r2'><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>1</span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'>14</span></div></div></div><div class='r3'><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-15'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>2</span><span class='teamb'>3</span></div></div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>4</span><span class='teamb'>5</span></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>14</span><span class='teamb'>15</span></div></div><div></div><div></div></div><div class='r2'><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>1</span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-16'><div class='brackets'><div class='group5' id='b0'><div class='r1'><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>5</span><span class='teamb'>6</span></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>11</span><span class='teamb'>12</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>13</span><span class='teamb'>14</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>15</span><span class='teamb'>16</span></div></div><div></div><div></div></div><div class='r2'><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r3'><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-17'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div><div class='r2'><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>5</span><span class='teamb'>6</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>9</span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>14</span><span class='teamb'>15</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>16</span><span class='teamb'>17</span></div></div></div><div class='r3'><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-18'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div></div><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>11</span><span class='teamb'>12</span></div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div><div class='r2'><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>5</span><span class='teamb'></span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>10</span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>13</span><span class='teamb'>14</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>15</span><span class='teamb'>16</span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'>17</span><span class='teamb'>18</span></div></div></div><div class='r3'><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-19'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div></div><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>6</span><span class='teamb'>7</span></div></div><div></div><div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>16</span><span class='teamb'>17</span></div></div><div></div><div></div><div></div><div></div></div><div class='r2'><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>5</span><span class='teamb'></span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>8</span><span class='teamb'>9</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>10</span><span class='teamb'>11</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'></span><span class='teamb'>14</span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'>15</span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'>18</span><span class='teamb'>19</span></div></div></div><div class='r3'><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-18' class='bracketbox'><span class='info'>18</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-20'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div></div><div></div><div></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>13</span><span class='teamb'>14</span></div></div><div></div><div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>17</span><span class='teamb'>18</span></div></div><div></div><div></div></div><div class='r2'><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>11</span><span class='teamb'>12</span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'>15</span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'>16</span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'>19</span><span class='teamb'>20</span></div></div></div><div class='r3'><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-18' class='bracketbox'><span class='info'>18</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-19' class='bracketbox'><span class='info'>19</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-21'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div></div><div></div><div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>12</span><span class='teamb'>13</span></div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>14</span><span class='teamb'>15</span></div></div><div></div><div></div><div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>19</span><span class='teamb'>20</span></div></div><div></div></div><div class='r2'><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'>11</span><span class='teamb'></span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'></span><span class='teamb'>16</span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'>17</span><span class='teamb'>18</span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'></span><span class='teamb'>21</span></div></div></div><div class='r3'><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-18' class='bracketbox'><span class='info'>18</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-19' class='bracketbox'><span class='info'>19</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-20' class='bracketbox'><span class='info'>20</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    me.brackets.push("<div class='brackets-22'><div class='brackets'><div class='group6' id='b0'><div class='r1'><div></div><div></div><div><div id='match-1' class='bracketbox'><span class='info'>1</span><span class='teama'>3</span><span class='teamb'>4</span></div></div><div></div><div></div><div><div id='match-2' class='bracketbox'><span class='info'>2</span><span class='teama'>7</span><span class='teamb'>8</span></div></div><div><div id='match-3' class='bracketbox'><span class='info'>3</span><span class='teama'>9</span><span class='teamb'>10</span></div></div><div></div><div></div><div><div id='match-4' class='bracketbox'><span class='info'>4</span><span class='teama'>13</span><span class='teamb'>14</span></div></div><div><div id='match-5' class='bracketbox'><span class='info'>5</span><span class='teama'>15</span><span class='teamb'>16</span></div></div><div></div><div></div><div></div><div><div id='match-6' class='bracketbox'><span class='info'>6</span><span class='teama'>20</span><span class='teamb'>21</span></div></div><div></div></div><div class='r2'><div><div id='match-7' class='bracketbox'><span class='info'>7</span><span class='teama'>1</span><span class='teamb'>2</span></div></div><div><div id='match-8' class='bracketbox'><span class='info'>8</span><span class='teama'></span><span class='teamb'>5</span></div></div><div><div id='match-9' class='bracketbox'><span class='info'>9</span><span class='teama'>6</span><span class='teamb'></span></div></div><div><div id='match-10' class='bracketbox'><span class='info'>10</span><span class='teama'></span><span class='teamb'>11</span></div></div><div><div id='match-11' class='bracketbox'><span class='info'>11</span><span class='teama'>12</span><span class='teamb'></span></div></div><div><div id='match-12' class='bracketbox'><span class='info'>12</span><span class='teama'></span><span class='teamb'>17</span></div></div><div><div id='match-13' class='bracketbox'><span class='info'>13</span><span class='teama'>18</span><span class='teamb'>19</span></div></div><div><div id='match-14' class='bracketbox'><span class='info'>14</span><span class='teama'></span><span class='teamb'>22</span></div></div></div><div class='r3'><div><div id='match-15' class='bracketbox'><span class='info'>15</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-16' class='bracketbox'><span class='info'>16</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-17' class='bracketbox'><span class='info'>17</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-18' class='bracketbox'><span class='info'>18</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r4'><div><div id='match-19' class='bracketbox'><span class='info'>19</span><span class='teama'></span><span class='teamb'></span></div></div><div><div id='match-20' class='bracketbox'><span class='info'>20</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r5'><div><div id='match-21' class='bracketbox'><span class='info'>21</span><span class='teama'></span><span class='teamb'></span></div></div></div><div class='r6'><div class='final'><div class='bracketbox'><span class='teamc'></span></div></div></div></div></div></div>");
    this.main();
  }


  main() {
    get(child(ref(this.db), 'tournament')).then((snapshot) => {
      this.tournamentObj = snapshot.val();
      this.tournaments = [];

      for (let i = 0; i < this.tournamentObj.length; i++) {
        this.tournaments.push([i, this.tournamentObj[i].setting.tournamentName]);
      }
      this.setState({ data: this.tournaments });
    })

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/setting')).then((snapshot) => {
      this.settingObj = snapshot.val();
      $('#tournamentName').html(this.settingObj.tournamentName);
    })

    get(child(ref(this.db), 'tournament/' + this.tournamentNoIndex + '/combat/')).then((snapshot) => {
      this.combatObj = snapshot.val();
      this.showListInfo();
    });
  }

  chooseTournament = (tournamentNoIndex) => {
    this.tournamentNoIndex = tournamentNoIndex;
    this.main();
  }

  chooseCategory = (cateoryNoIndex) => {
    this.showListMatchs(cateoryNoIndex);
  }

  showListInfo() {
    if (this.combatObj && this.combatObj.length > 0) {
      this.categoryArray = ["ALL"];
      for (let i = 0; i < this.combatObj.length; i++) {
        if (!this.categoryArray.includes(this.combatObj[i].match.category)) {
          this.categoryArray.push(this.combatObj[i].match.category);
        }
      }
      this.setState({ data: this.categoryArray });
      this.showListMatchs("ALL");
      document.querySelector('input[name="optionCategory"]').checked = true;
    }
  }

  showListMatchs(category) {
    $('#schema-bracket').html("");
    let matchNum = 0;
    let nameWin = "";
    let fighters = [];
    for (let i = 0; i < this.combatObj.length; i++) {
      if (this.combatObj[i].match.category === category || category === "ALL") {
        matchNum++;
        let combat = this.combatObj[i];
        if (!fighters.includes(combat.fighters.redFighter.name + combat.fighters.redFighter.code) && !combat.fighters.redFighter.name.includes("W.") && !combat.fighters.redFighter.name.includes("L.")) {
          fighters.push(combat.fighters.redFighter.name + combat.fighters.redFighter.code);
        }
        if (!fighters.includes(combat.fighters.blueFighter.name + combat.fighters.blueFighter.code) && !combat.fighters.blueFighter.name.includes("W.") && !combat.fighters.blueFighter.name.includes("L.")) {
          fighters.push(combat.fighters.blueFighter.name + combat.fighters.blueFighter.code);
        }
      }
    }
    //COPY một schema vào id schema-bracket
    $('#schema-bracket').html(this.brackets[fighters.length]);

    this.combatArray = [];
    let matchNo = 0;
    for (let i = 0; i < this.combatObj.length; i++) {
      if (this.combatObj[i].match.category === category || category === "ALL") {
        let combat = this.combatObj[i];

        nameWin = "";
        if (combat.match.win === "red") {
          nameWin = combat.fighters.redFighter.name;
        } else if (combat.match.win === "blue") {
          nameWin = combat.fighters.blueFighter.name
        } else {
          nameWin = "";
        }

        this.combatArray.push([
          combat.match.no,
          combat.match.type,
          combat.match.category,
          combat.fighters.redFighter.name,
          combat.fighters.redFighter.code,
          combat.fighters.redFighter.country,
          combat.fighters.blueFighter.name,
          combat.fighters.blueFighter.code,
          combat.fighters.blueFighter.country,
          nameWin
        ]);

        //Với từng trận thì nhét 2 VDV vào class info.html=1,2,3
        matchNo++;
        $('#match-' + matchNo + ' .info').html(combat.match.no);
        $('#match-' + matchNo + ' .teama').html(combat.fighters.redFighter.name);
        $('#match-' + matchNo + ' .teamb').html(combat.fighters.blueFighter.name);

      }
    }

    this.setState({ data: this.combatArray });

    //Đến trận final 
    $('.final .teamc').html(nameWin);


  }

  render() {
    return (
      <div>
        <div className="body" style={{ height: '100vh' }}>
          <div className="container">
            <header className="blog-header py-3">
              <div className="row flex-nowrap justify-content-between align-items-center">
                <div className="col-4 pt-1">
                  <h3 className="text-pomegrante" id="tournamentName"></h3>
                </div>
                <div className="col-4 text-center">
                  <h2 className="blog-header-logo text-midnight-blue">Thông tin các trận đấu đối kháng</h2>

                </div>
                <div className="col-4 d-flex justify-content-end align-items-center">
                  <span className="text-muted">
                    <img src={logo} alt="..." className="img-fluid" style={{ height: "38px" }} />
                  </span>
                </div>
              </div>
            </header>
            <hr className="mt-4 mb-2" />
            <header className="blog-header">
              <div className="row flex-nowrap justify-content-between align-items-center">
                <div className="category-buttons">
                  <section className="btn-group">
                    {this.tournaments && this.tournaments.length > 0 ? this.tournaments.map((tournament, i) => (
                      <div className='form-check' key={i} onClick={() => this.chooseTournament(i)}>
                        <input type="radio" className="btn-check" name="tournamentRadio" onClick={() => this.chooseTournament(i)} id={`tournamentRadio-${tournament[0]}`} value={tournament[1]} defaultChecked={i === 0} />
                        <label className="btn btn-outline-warning" htmlFor={`tournamentRadio-${tournament[0]}`}><i className="fas fa-caret-right"></i> {tournament[1]}</label>
                      </div>
                    )) : (
                      <div></div>
                    )}
                  </section>
                </div>
              </div>
            </header>
            <hr className="mt-2 mb-4" />
          </div>
          <div className="category-buttons">
            <section className="btn-group">
              {this.categoryArray && this.categoryArray.length > 0 ? this.categoryArray.map((category, i) => (
                <React.Fragment key={i - 1}>
                  <input type="radio" className="btn-check" name="optionCategory" onClick={() => this.chooseCategory(category)} id={`optionCategory-${i - 1}`} value={category} defaultChecked={i === 0} />
                  <label className="btn btn-outline-warning" htmlFor={`optionCategory-${i - 1}`}><i className="fa-solid fa-user"></i> {category}</label>
                </React.Fragment>
              )) : (
                <React.Fragment></React.Fragment>
              )}
            </section>
          </div>

          <div className=" tbl-info">
            <table className="tbl-header-tournament-info" id="table">
              <thead>
                <tr>
                  <th className="text-center">
                    Mã trận đấu
                  </th>
                  <th>
                    Trận
                  </th>
                  <th>
                    Hạng cân
                  </th>
                  <th>
                    Vận động viên đỏ
                  </th>
                  <th>
                    MSSV/Đơn vị
                  </th>
                  <th>
                    QUỐC GIA ĐỎ
                  </th>
                  <th>
                    Vận động viên xanh
                  </th>
                  <th>
                    MSSV/Đơn vị
                  </th>
                  <th>
                    QUỐC GIA XANH
                  </th>
                  <th>
                    Người thắng
                  </th>
                </tr>
              </thead>
              <tbody>
                {this.combatArray && this.combatArray.length > 0 ? this.combatArray.map((combat, i) => (
                  <React.Fragment key={i}>
                    <tr>
                      <td className='text-center'>{combat[0]}</td>
                      <td>{combat[1]}</td>
                      <td>{combat[2]}</td>
                      <td>{combat[3]}</td>
                      <td>{combat[4]}</td>
                      <td>{combat[5]}</td>
                      <td>{combat[6]}</td>
                      <td>{combat[7]}</td>
                      <td>{combat[8]}</td>
                      <td>{combat[9]}</td>
                    </tr>
                  </React.Fragment>
                )) : (
                  <React.Fragment></React.Fragment>
                )}
              </tbody>
            </table>
          </div>

          <div id="schema-bracket">
          </div>

          <div className="container">
            <footer className="py-3 my-4">
              <ul className="nav justify-content-center border-bottom pb-3 mb-3">
              </ul>
              <p className="text-center text-muted">©Tuân 2022</p>
            </footer>
          </div>

        </div>
      </div>
    );
  }
}

export default InformationDkContainer;
