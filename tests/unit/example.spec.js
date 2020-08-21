import { expect } from 'chai';
import { shallowMount } from '@vue/test-utils';
import HomePage from '@/views/Home.vue';

describe('Home.vue', () => {
  it('renders Home page text', () => {
    const wrapper = shallowMount(HomePage, {/* propsData: { msg }, */});
    expect(wrapper.text()).to.include('FIVEx');
  });
});
