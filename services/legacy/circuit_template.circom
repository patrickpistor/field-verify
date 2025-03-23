pragma circom 2.0.0;

// A simple boolean check for value within range
template InRange() {
    signal input value;
    signal input min_value;
    signal input max_value;
    signal output in_range;
    
    // Compute a boolean for value >= min_value
    signal above_min <-- value >= min_value ? 1 : 0;
    above_min * (1 - above_min) === 0; // Constrain to 0 or 1
    
    // Compute a boolean for value <= max_value
    signal below_max <-- value <= max_value ? 1 : 0;
    below_max * (1 - below_max) === 0; // Constrain to 0 or 1
    
    // Both conditions must be true
    in_range <== above_min * below_max;
}

template MaterialVerifier(num_properties) {
    signal input property_values[num_properties];
    signal input min_thresholds[num_properties];
    signal input max_thresholds[num_properties];
    
    signal output property_compliance[num_properties];
    signal output all_compliant;
    
    // Check each property
    component range_checks[num_properties];
    
    for (var i = 0; i < num_properties; i++) {
        range_checks[i] = InRange();
        range_checks[i].value <== property_values[i];
        range_checks[i].min_value <== min_thresholds[i];
        range_checks[i].max_value <== max_thresholds[i];
        
        property_compliance[i] <== range_checks[i].in_range;
    }
    
    // Compute if all properties comply
    signal interim[num_properties+1];
    interim[0] <== 1;
    
    for (var i = 0; i < num_properties; i++) {
        interim[i+1] <== interim[i] * property_compliance[i];
    }
    
    all_compliant <== interim[num_properties];
}

// NUM_PROPERTIES_PLACEHOLDER
component main {public [min_thresholds, max_thresholds]} = MaterialVerifier(5);