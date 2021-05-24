<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-sm-12">
        <h1>About</h1>
        <dt>FIVEx browser</dt>
        <dd>
          <p>
            FIVEx is a tool for browsing expression and splice QTL (cis-eQTL and cis-sQTL) datasets. It provides a number of tools aimed at functional interpretation.
            See our <a href="https://www.biorxiv.org/content/10.1101/2021.01.22.426874v1">preprint</a> for details.
          </p>

          <p>
            Created by Alan Kwong, Mukai Wang, Peter VandeHaar, Andy Boughton, and Hyun Min Kang.
            Source code can be found on <a href="https://github.com/statgen/fivex/">GitHub</a>.
          </p>
        </dd>
      </div>
    </div>
    <dl>
      <dt>Data source and format</dt>
      <dd>
        <p>
          We present RNA-seq data aggregated, harmonized, and analyzed by the <a href="https://www.ebi.ac.uk/eqtl/">EBI eQTL Catalogue</a>.
        </p>
        <p>
          More detailed information about contributing studies can be found <a href="https://www.ebi.ac.uk/eqtl/Studies/">here</a>.
          Raw data can be downloaded <a href="https://www.ebi.ac.uk/eqtl/Data_access/">here</a>.
        </p>
        <p>
          Genome positions use coordinates from human genome build GRCh38.
        </p>
      </dd>
      <br>
      <table class="table table-striped">
        <thead>
          <tr>
            <th scope="col">
              Study Name
            </th>
            <th scope="col">
              Cell/Tissue Type
            </th>
            <th scope="col">
              Samples
            </th>
            <th scope="col">
              Donors
            </th>
            <th scope="col">
              Reference
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">
              Alasoo_2018
            </th>
            <td>
              macrophages
            </td>
            <td>
              336
            </td>
            <td>
              84
            </td>
            <td>
              <a href="https://dx.doi.org/10.1038/s41588-018-0046-7">Alasoo et al. 2018</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              BLUEPRINT
            </th>
            <td>
              monocytes, neutrophils, CD4+ T cells
            </td>
            <td>
              554
            </td>
            <td>
              197
            </td>
            <td>
              <a href="https://doi.org/10.1016/j.cell.2016.10.026">Chen et al. 2016</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              BrainSeq
            </th>
            <td>
              brain (dorsolateral prefrontal cortex)
            </td>
            <td>
              484
            </td>
            <td>
              484
            </td>
            <td>
              <a href="https://doi.org/10.1038/s41593-018-0197-y">Jaffe et al. 2018</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              FUSION
            </th>
            <td>
              adipose, muscle
            </td>
            <td>
              559
            </td>
            <td>
              302
            </td>
            <td>
              <a href="https://doi.org/10.1073/pnas.1814263116">Taylor et al. 2019</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              GENCORD
            </th>
            <td>
              LCLs, fibroblasts, T cells
            </td>
            <td>
              560
            </td>
            <td>
              195
            </td>
            <td>
              <a href="https://doi.org/10.7554/eLife.00523">Gutierrez-Arcelus et al. 2013</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              GEUVADIS
            </th>
            <td>
              LCLs
            </td>
            <td>
              445
            </td>
            <td>
              445
            </td>
            <td>
              <a href="https://doi.org/10.1038/nature12531">Lappalainen et al. 2013</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              GTEx v7
            </th>
            <td>
              49 tissues
            </td>
            <td>
              8356
            </td>
            <td>
              507
            </td>
            <td>
              <a href="https://doi.org/10.1126/science.aaz1776">The GTEx Consortium 2020</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              HipSci
            </th>
            <td>
              iPSCs
            </td>
            <td>
              322
            </td>
            <td>
              322
            </td>
            <td>
              <a href="https://doi.org/10.1038/nature22403">Kilpinen et al. 2017</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              Lepik_2017
            </th>
            <td>
              blood
            </td>
            <td>
              491
            </td>
            <td>
              491
            </td>
            <td>
              <a href="https://doi.org/10.1371/journal.pcbi.1005766">Lepik et al. 2017</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              Nedelec_2016
            </th>
            <td>
              macrophages
            </td>
            <td>
              493
            </td>
            <td>
              168
            </td>
            <td>
              <a href="http://dx.doi.org/10.1016/j.cell.2016.09.025">Nédélec et al. 2016</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              Quach_2016
            </th>
            <td>
              monocytes
            </td>
            <td>
              969
            </td>
            <td>
              200
            </td>
            <td>
              <a href="http://dx.doi.org/10.1016/j.cell.2016.09.024">Quach et al. 2016</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              ROSMAP
            </th>
            <td>
              brain (dorsolateral prefrontal cortex)
            </td>
            <td>
              576
            </td>
            <td>
              576
            </td>
            <td>
              <a href="https://doi.org/10.1038/nn.4632">Ng et al. 2017</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              Schmiedel_2018
            </th>
            <td>
              immune cells
            </td>
            <td>
              1331
            </td>
            <td>
              91
            </td>
            <td>
              <a href="https://doi.org/10.1016/j.cell.2018.10.022">Schmiedel et al. 2018</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              Schwartzentruber_2018
            </th>
            <td>
              sensory neurons
            </td>
            <td>
              98
            </td>
            <td>
              98
            </td>
            <td>
              <a href="http://dx.doi.org/10.1038/s41588-017-0005-8">Schwartzentruber et al. 2018</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              TwinsUK
            </th>
            <td>
              adipose, LCLs, skin, blood
            </td>
            <td>
              1364
            </td>
            <td>
              433
            </td>
            <td>
              <a href="http://dx.doi.org/10.1038/ng.3162">Buil et al. 2015</a>
            </td>
          </tr>
          <tr>
            <th scope="row">
              van_de_Bunt_2015
            </th>
            <td>
              pancreatic islets
            </td>
            <td>
              117
            </td>
            <td>
              117
            </td>
            <td>
              <a href="https://doi.org/10.1371/journal.pgen.1005694">van de Bunt et al. 2015</a>
            </td>
          </tr>
        </tbody>
      </table>
    </dl>
  </div>
</template>

<script>
export default {
    name: 'About',
};
</script>

<style scoped>

</style>
