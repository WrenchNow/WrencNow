-- Service catalog (product configuration, not test data).
-- required_tier drives the skill-tier gate: basic mechanics only see basic jobs.
insert into public.services (slug, name, description, required_tier, est_minutes_min, est_minutes_max, icon, sort) values
  ('oil-change',        'Oil change',            'Drain, new filter, refill with the right oil for your engine.',        'basic',     30,  60,  '🛢',  10),
  ('battery',           'Battery replacement',   'Test, swap, and terminal clean. Old battery hauled off.',              'basic',     20,  45,  '🔋',  20),
  ('wipers',            'Wiper blades',          'New front (and rear) wiper blades fitted.',                             'basic',     10,  20,  '🌧',  30),
  ('air-filters',       'Engine & cabin filters','Replace engine air filter and cabin air filter.',                       'basic',     15,  40,  '💨',  40),
  ('bulbs',             'Headlight & bulb swap', 'Replace burnt-out headlights, tail lights, or turn signals.',            'basic',     15,  45,  '💡',  50),
  ('tire-rotation',     'Tire rotation',         'Rotate tires and set pressures. Visual tread and brake check.',         'basic',     30,  60,  '🔄',  60),
  ('jump-start',        'Jump start',            'Get you started and test the charging system.',                        'basic',     15,  30,  '⚡',  70),
  ('brakes',            'Brake pads & rotors',   'Inspect, replace pads and rotors as needed, test drive.',               'certified', 60,  150, '🛑',  80),
  ('check-engine',      'Check engine diagnosis','Scan codes, diagnose the cause, and explain it in plain English.',      'certified', 45,  90,  '🔍',  90),
  ('ac-heat',           'AC / heat service',     'Diagnose and recharge AC, or fix heating problems.',                    'certified', 60,  120, '❄️', 100),
  ('spark-plugs',       'Spark plugs & tune-up', 'Replace plugs and coils as needed, check ignition system.',             'certified', 60,  180, '⚙️', 110),
  ('electrical',        'Electrical diagnosis',  'Track down shorts, dead circuits, starter and alternator problems.',    'certified', 60,  180, '🔌', 120),
  ('suspension',        'Suspension & steering', 'Shocks, struts, control arms, tie rods.',                              'certified', 90,  240, '🛞', 130),
  ('starter-alternator','Starter / alternator',  'Replace a failed starter or alternator.',                               'certified', 60,  180, '🔧', 140),
  ('timing-belt',       'Timing belt / chain',   'Timing belt or chain replacement with water pump if needed.',           'master',    180, 480, '⏱',  150),
  ('transmission',      'Transmission service',  'Fluid service and diagnosis of shifting problems.',                     'master',    60,  240, '⚙️', 160),
  ('european',          'European vehicle repair','Diagnosis and repair on BMW, Audi, Mercedes, VW, Volvo.',             'master',    60,  240, '🇪🇺', 170)
on conflict (slug) do nothing;
