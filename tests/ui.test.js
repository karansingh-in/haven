import React from 'react';
import renderer from 'react-test-renderer';
import { Screen, Card, Row, Button, PressableScale, Section, Separator, Badge } from '../src/ui';

test('Screen renders with safe area and margin', () => {
  const tree = renderer.create(
    React.createElement(Screen, null, React.createElement('Text', null, 'Hi'))
  ).toJSON();
  expect(tree).toMatchSnapshot();
});

test('Card renders without error', () => {
  const tree = renderer.create(
    React.createElement(Card, null, React.createElement('Text', null, 'Content'))
  ).toJSON();
  expect(tree).toBeDefined();
});

test('Button renders without error', () => {
  const filled = renderer.create(
    React.createElement(Button, { variant: 'filled' }, 'Go')
  ).toJSON();
  expect(filled).toBeDefined();
  const tinted = renderer.create(
    React.createElement(Button, { variant: 'tinted' }, 'Go')
  ).toJSON();
  expect(tinted).toBeDefined();
});

test('PressableScale wraps children', () => {
  const tree = renderer.create(
    React.createElement(PressableScale, { onPress: () => {} }, React.createElement('Text', null, 'Tap'))
  ).toJSON();
  expect(tree).toBeDefined();
});

test('Section renders with header', () => {
  const tree = renderer.create(
    React.createElement(Section, { header: 'Test' }, React.createElement('Text', null, 'Content'))
  ).toJSON();
  expect(tree).toBeDefined();
});

test('Separator renders', () => {
  const tree = renderer.create(React.createElement(Separator)).toJSON();
  expect(tree).toBeDefined();
});

test('Badge renders with text', () => {
  const tree = renderer.create(
    React.createElement(Badge, null, 'New')
  ).toJSON();
  expect(tree).toBeDefined();
});