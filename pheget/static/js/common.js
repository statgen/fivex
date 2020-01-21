/* global LocusZoom */
/**
 * Shared code used by various LocusZoom views
 */

/**
 * Helper method that fetches a desired field value regardless of namespacing
 * @param {object} point_data
 * @param {string} field_suffix
 */
function retrieveBySuffix(point_data, field_suffix) {
    const match = Object.entries(point_data)
        .find(item => item[0].endsWith(field_suffix));
    return match ? match[1] : null;
}

/**
 * Convert Posterior incl probabilities to a (truncated) log scale for rendering
 */
LocusZoom.TransformationFunctions.set('pip_yvalue', function (x) { return Math.max(Math.log10(x), -6); });

/**
 * Assign point shape based on PIP cluster designation. Since there are always just a few clusters, and cluster 1
 *  is most significant, this hard-coding is a workable approach.
 */
LocusZoom.ScaleFunctions.add('pip_cluster', function (parameters, input) {
    if (typeof input !== 'undefined') {
        var pip_cluster = retrieveBySuffix(input, ':pip_cluster');
        if (pip_cluster === 1) {
            return 'cross';
        }
        if (pip_cluster === 2) {
            return 'square';
        }
        if (pip_cluster === 3) {
            return 'triangle-up';
        }
        if (pip_cluster >= 4) {
            return 'triangle-down';
        }
    }
    return null;
});

/**
 * Assign point shape as arrows based on direction of effect
 */
LocusZoom.ScaleFunctions.add('effect_direction', function (parameters, input) {
    if (typeof input !== 'undefined') {
        var beta = retrieveBySuffix(input, ':beta');
        var stderr_beta = retrieveBySuffix(input, ':stderr_beta');
        if (beta === null || stderr_beta === null) { return null; }
        if (!isNaN(beta) && !isNaN(stderr_beta)) {
            if (beta - 1.96 * stderr_beta > 0) {
                return parameters['+'] || null;
            } // 1.96*se to find 95% confidence interval
            if (beta + 1.96 * stderr_beta < 0) {
                return parameters['-'] || null;
            }
        }
    }
    return null;
});
