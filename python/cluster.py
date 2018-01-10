import pandas
import numpy as np
from scipy.cluster.hierarchy import linkage, to_tree
from scipy.cluster.hierarchy import cophenet
from scipy.spatial.distance import pdist
import sys

def test_clustering(z, d):
    # checks the Cophenetic Correlation Coefficient of the clustering results.
    # this compares the actual pairwise distances to those implied by the hierarchical clustering.
    # the closer the value is to 1, the better the clustering preserves the original distances.
    c, coph_dists = cophenet(z, pdist(d))
    print "The Cophenetic Correlation Coefficient is " + str(c)


def to_newick(node, newick, parent_dist, leaf_names):
    '''
    reports the tree structure in the Newick format.
    a depth-first search, postorder traversal

    :param node: a tree node
    :param newick: a string in newick format
    :param parent_dist: the parent node distance
    :param leaf_names: a list of leaf labels
    :return: newick string
    '''

    if node.is_leaf():  # leaf nodes
        return "%s:%.2f%s" % (leaf_names[node.id], parent_dist - node.dist, newick)
    else:
        if len(newick) == 0:  # the root node
            newick = ");"
        else: # internal nodes
            newick = "):%.2f%s" %(parent_dist - node.dist, newick)

        # left child node
        newick = to_newick(node.get_left(), newick, node.dist, leaf_names)

        # right child node
        newick = to_newick(node.get_right(), "," + newick, node.dist, leaf_names)

        newick = "(" + newick

        return newick


def cluster(m, method = "ward"):
    '''
    performs the hierarchical clustering
    '''

    Z = linkage(m, method)

    # tests the clustering results
    test_clustering(Z, m)
    return Z


def generate_matrix(df, value="medianTPM", row="geneSymbol", col="tissueId", adjust=1.0, log_transform=True):
    '''
    generates the matrix for the clustering program
    :param df: a pandas data frame
    :param value: a column name in the df. the data of the matrix
    :param row: a column name in the df. the rows of the matrix
    :param col: a column name in the df. the columns of the matrix
    :return: a data matrix
    '''

    df = df.sort_values(by=[row, col])

    # transform data values
    df[value] = df[value] + adjust
    if log_transform:
        df[value] = np.log10(df[value])

    # groups = df.groupby([col])
    groups = df[col].unique()
    print "Number of groups " + str(len(groups))
    return np.reshape(df.as_matrix(columns=[value]), (-1, len(groups))), df[row].unique()
    # return np.reshape(df.as_matrix(columns=[value]), (-1, len(groups))), df[row]
if __name__ == '__main__':

    # test case: the Anderson's iris data

    test_file = "data/iris.tsv"
    iris_data_frame = pandas.read_csv(test_file, sep="\t")
    mat = iris_data_frame.as_matrix(columns=["Sepal.Length", "Sepal.Width", "Petal.Length", "Petal.Width"])
    leaf_labels = iris_data_frame.Species
    clusters = cluster(mat, method="average")
    root = to_tree(clusters, False)
    print to_newick(root, "", root.dist, leaf_labels)

    dfile = input("Enter a tsv file:") # must have the medianTPM, geneSymbol, tissueId fields
    # print dfile
    data_frame = pandas.read_csv(dfile, sep="\t")

    # first generates gene clusters based on expression in tissues
    mat, leaf_labels = generate_matrix(data_frame)
    clusters = cluster(mat, method="average")
    root = to_tree(clusters, False)
    print to_newick(root, "", root.dist, leaf_labels)

    # then generates tissue clusters based on expression of genes
    data_frame = pandas.read_csv(dfile, sep="\t")

    mat, leaf_labels = generate_matrix(data_frame, row="tissueId", col="geneSymbol", log_transform=True)
    print mat.shape
    clusters = cluster(mat, method="average")
    root = to_tree(clusters, False)
    print root
    print to_newick(root, "", root.dist, leaf_labels)


