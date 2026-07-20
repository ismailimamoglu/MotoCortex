Pod::Spec.new do |s|
  s.name           = 'MotoCortexOBDModule'
  s.version        = '1.0.0'
  s.summary        = 'Local native OBD core module for MotoCortex'
  s.description    = 'Local native OBD core module for MotoCortex'
  s.author         = 'Ismail Imamoglu'
  s.homepage       = 'https://github.com/obra/superpowers'
  s.platforms      = { :ios => '13.4' }
  s.source         = { :git => '' }
  s.source_files   = '**/*.{h,m,swift}'
  s.dependency 'ExpoModulesCore'

  s.swift_version = '5.4'
end
