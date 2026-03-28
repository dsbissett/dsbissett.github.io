import * as tf from '@tensorflow/tfjs';

export interface TetrisSerializedModelArtifacts {
  modelTopology: tf.io.ModelArtifacts['modelTopology'];
  weightSpecs: tf.io.WeightsManifestEntry[];
  weightDataBase64: string;
}
