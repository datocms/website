import React from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'
import Navbar from '../components/Navbar'

import './style.sass'

const TemplateWrapper = ({ children }) => (
  <div>
    <Helmet title="DatoCMS" />
      <Navbar />
      {children()}
  </div>
)

TemplateWrapper.propTypes = {
  children: PropTypes.func,
}

export default TemplateWrapper
