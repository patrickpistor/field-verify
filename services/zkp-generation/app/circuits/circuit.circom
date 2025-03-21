pragma circom 2.0.0;

// A reusable component that checks if a value is within bounds
template WithinRange() {
    signal input value;
    signal input min_value;
    signal input max_value;
    signal output is_compliant;
    
    // Check if value is within range
    is_compliant <== (value >= min_value) * (value <= max_value);
}

// Main verification circuit with support for multiple properties
template MaterialVerifier(num_properties) {
    // Arrays of inputs for each property
    signal input property_values[num_properties];
    signal input min_thresholds[num_properties];
    signal input max_thresholds[num_properties];
    
    // Array of output compliance signals
    signal output property_compliance[num_properties];
    signal output all_compliant;
    
    // Variable to track overall compliance
    var total_compliance = 1;
    
    // Check each property
    for (var i = 0; i < num_properties; i++) {
        component range_check = WithinRange();
        range_check.value <== property_values[i];
        range_check.min_value <== min_thresholds[i];
        range_check.max_value <== max_thresholds[i];
        
        property_compliance[i] <== range_check.is_compliant;
        total_compliance *= range_check.is_compliant;
    }
    
    all_compliant <== total_compliance;
}

// The main component instantiates our template with a parameter
// indicating the number of properties to check
component main {public [min_thresholds, max_thresholds]} = MaterialVerifier(5);