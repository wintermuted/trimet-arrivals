import 'jest-enzyme';
import { configure } from 'enzyme';
import Adapter from '@cfaester/enzyme-adapter-react-18';

window.URL.createObjectURL = function() {};

configure({ adapter: new Adapter() });
