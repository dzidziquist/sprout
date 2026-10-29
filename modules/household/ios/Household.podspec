Pod::Spec.new do |s|
  s.name           = 'Household'
  s.version        = '1.0.0'
  s.summary        = "PlantFam's household sharing over CloudKit"
  s.description    = 'A thin CloudKit bridge: a zone-wide share, records, photos and invites.'
  s.author         = ''
  s.homepage       = 'https://github.com/dzidziquist/sprout'
  s.license        = { :type => 'MIT' }
  # Must not ask for a newer iOS than the app (Podfile: 15.1), or Expo quietly leaves the pod out.
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'CloudKit', 'UIKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files   = '**/*.{h,m,swift}'
end
